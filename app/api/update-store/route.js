import mysql from 'mysql2/promise';

export async function POST(req) {
  try {
    const body = await req.json();
    const { id, countrycode, phonenumber, phone_number_id, waba_id } = body;

    const connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    });

    // 1. Update store
    const [updateResult] = await connection.execute(
      `UPDATE stores SET countrycode = ?, phonenumber = ?, phone_number_id = ?, waba_id = ? WHERE id = ?`,
      [countrycode, phonenumber, phone_number_id, waba_id, id]
    );

    if (updateResult.affectedRows === 0) {
      await connection.end();
      return new Response(JSON.stringify({ message: 'No matching store found' }), { status: 404 });
    }

    // 2. Fetch from API
    const templateApiUrl = `${process.env.NEXT_PUBLIC_BASEURL}/chat/templates?waba_id=${waba_id}&limit=100&offset=0`;

    const response = await fetch(templateApiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer KIM7l16W0ijm6loVbaKoK4gsHJrrFt8LjceH9RyEna`,
        'X-MYOP-COMPANY-ID': '5cd40f6554442586',
      },
      signal: AbortSignal.timeout(30000),
    });

    console.log("whole response:::", response);

    if (!response.ok) {
      await connection.end();
      return new Response(JSON.stringify({ message: 'Failed to fetch templates from external API' }), { status: 500 });
    }

    const data = await response.json();

    if (!data?.data?.results?.length) {
      await connection.end();
      return new Response(JSON.stringify({ message: 'No templates found from external API' }), { status: 200 });
    }

    const templates = data.data.results;
    const seenTemplates = new Set();
    let insertedTemplateCount = 0;
    let insertedTemplateDataCount = 0;
    let updatedTemplateVariableCount = 0;
    let insertedTemplateVariableCount = 0;

    // Helper function to extract variables from text
    function extractVariables(text) {
      if (!text) return [];
      const regex = /\{\{([^}]+)\}\}/g;
      const variables = [];
      let match;
      while ((match = regex.exec(text)) !== null) {
        variables.push(match[1].trim());
      }
      return variables;
    }

    for (const template of templates) {
      const { name: template_name, category, components } = template;

      if (!template_name || !category) continue;

      // Check if template already exists for this store and phone number
      const uniqueKey = `${category}::${template_name}::${phonenumber}`;
      if (seenTemplates.has(uniqueKey)) continue;
      seenTemplates.add(uniqueKey);

      // Check if template already exists in database for this store and phone number
      const [existingTemplate] = await connection.execute(
        `SELECT template_id FROM template WHERE store_id = ? AND category = ? AND template_name = ? AND phonenumber = ?`,
        [id, category, template_name, phonenumber]
      );

      let templateId;

      if (existingTemplate.length > 0) {
        // Template exists, use existing ID
        templateId = existingTemplate[0].template_id;
        
        // Update timestamp
        await connection.execute(
          `UPDATE template SET updated_at = CURRENT_TIMESTAMP() WHERE template_id = ?`,
          [templateId]
        );
      } else {
        // Insert new template with phone number
        const [templateInsertResult] = await connection.execute(
          `INSERT INTO template (store_id, category, template_name, phonenumber, created_at, updated_at)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())`,
          [id, category, template_name, phonenumber]
        );

        templateId = templateInsertResult.insertId;
        insertedTemplateCount++;
      }

      // Handle template_data
      if (Array.isArray(components)) {
        const content = JSON.stringify(components);

        console.log("content whole:::", content);

        // Check if template_data already exists
        const [existingTemplateData] = await connection.execute(
          `SELECT template_data_id FROM template_data WHERE template_id = ?`,
          [templateId]
        );

        let templateDataId;

        if (existingTemplateData.length > 0) {
          // Update existing template_data
          templateDataId = existingTemplateData[0].template_data_id;
          
          await connection.execute(
            `UPDATE template_data SET content = ?, updated_at = CURRENT_TIMESTAMP() WHERE template_data_id = ?`,
            [content, templateDataId]
          );
        } else {
          // Insert new template_data
          const [templateDataInsertResult] = await connection.execute(
            `INSERT INTO template_data (template_id, content, phonenumber, created_at, updated_at)
             VALUES (?, ?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())`,
            [templateId, content, phonenumber]
          );

          templateDataId = templateDataInsertResult.insertId;
          insertedTemplateDataCount++;
        }

        // Extract and handle variables by component type
        for (const component of components) {
          const { type, format } = component;

          if (!type) continue;

          let variables = [];

          // Extract variables based on component type
          switch (type) {
            case 'HEADER':
              if (format === 'TEXT' && component.text) {
                variables = extractVariables(component.text);
              } else if (format === 'MEDIA') {
                variables = [];
              }
              break;

            case 'BODY':
              if (component.text) {
                variables = extractVariables(component.text);
              }
              break;

            case 'BUTTONS':
              if (component.buttons && Array.isArray(component.buttons)) {
                component.buttons.forEach(button => {
                  if (button.text) {
                    variables.push(button.text);
                  }
                });
              }
              break;

            default:
              if (component.text) {
                variables = extractVariables(component.text);
              }
              break;
          }

          // Handle individual variables for mapping UI
          for (const variable of variables) {
            // Check if variable already exists
            const [existingVariable] = await connection.execute(
              `SELECT template_variable_id, mapping_field, fallback_value FROM template_variable 
               WHERE template_data_id = ? AND variable_name = ? AND component_type = ?`,
              [templateDataId, variable, type]
            );

            if (existingVariable.length > 0) {
              // Variable exists, update only if mapping_field and fallback_value are not set
              const existing = existingVariable[0];
              if (!existing.mapping_field && !existing.fallback_value) {
                await connection.execute(
                  `UPDATE template_variable SET updated_at = CURRENT_TIMESTAMP() WHERE template_variable_id = ?`,
                  [existing.template_variable_id]
                );
                updatedTemplateVariableCount++;
              }
            } else {
              // Insert new variable
              await connection.execute(
                `INSERT INTO template_variable (
                  template_data_id, 
                  type, 
                  value, 
                  variable_name, 
                  component_type, 
                  mapping_field, 
                  fallback_value,
                  phonenumber,
                  created_at, 
                  updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())`,
                [
                  templateDataId, 
                  type,                    
                  null,                
                  variable,                
                  type,                    
                  null,                    
                  null,
                  phonenumber
                ]
              );
              insertedTemplateVariableCount++;
            }
          }

          // Handle full component data for reference
          const componentType = `${type}_COMPONENT`;
          
          // Check if component already exists
          const [existingComponent] = await connection.execute(
            `SELECT template_variable_id FROM template_variable 
             WHERE template_data_id = ? AND type = ?`,
            [templateDataId, componentType]
          );

          if (existingComponent.length > 0) {
            // Update existing component
            await connection.execute(
              `UPDATE template_variable SET 
               value = ?, 
               updated_at = CURRENT_TIMESTAMP() 
               WHERE template_variable_id = ?`,
              [JSON.stringify(component), existingComponent[0].template_variable_id]
            );
            updatedTemplateVariableCount++;
          } else {
            // Insert new component
            await connection.execute(
              `INSERT INTO template_variable (
                template_data_id, 
                type, 
                value, 
                variable_name, 
                component_type, 
                mapping_field, 
                fallback_value,
                phonenumber,
                created_at, 
                updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())`,
              [
                templateDataId, 
                componentType,     
                JSON.stringify(component), 
                null,                    
                type,                   
                null,                    
                null,
                phonenumber
              ]
            );
            insertedTemplateVariableCount++;
          }
        }
      }
    }

    await connection.end();

    return new Response(JSON.stringify({
      message: 'Store and templates updated successfully',
      templateCount: insertedTemplateCount,
      templateDataCount: insertedTemplateDataCount,
      insertedVariableCount: insertedTemplateVariableCount,
      updatedVariableCount: updatedTemplateVariableCount,
      phonenumber: phonenumber
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Update error:', error);
    return new Response(JSON.stringify({
      message: 'Error updating store and templates',
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}