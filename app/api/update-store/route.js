import mysql from 'mysql2/promise';

export async function POST(req) {
  try {
    const body = await req.json();
    const { store_id, waba_id, phonenumber } = body;

    // Validate required fields
    if (!store_id || !waba_id || !phonenumber) {
      return new Response(JSON.stringify({ 
        success: false,
        message: 'Missing required fields: store_id, waba_id, and phonenumber are required' 
      }), { status: 400 });
    }

    const connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    });

    // Verify store exists
    const [storeExists] = await connection.execute(
      `SELECT id FROM stores WHERE id = ?`,
      [store_id]
    );

    if (storeExists.length === 0) {
      await connection.end();
      return new Response(JSON.stringify({ 
        success: false,
        message: 'Store not found' 
      }), { status: 404 });
    }

    // Fetch templates from external API
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

    console.log("Template sync response status:", response.status);

    if (!response.ok) {
      await connection.end();
      return new Response(JSON.stringify({ 
        success: false,
        message: `Failed to fetch templates from external API. Status: ${response.status}` 
      }), { status: 500 });
    }

    const data = await response.json();

    if (!data?.data?.results?.length) {
      await connection.end();
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No templates found from external API',
        templateCount: 0
      }), { status: 200 });
    }

    const templates = data.data.results;
    const seenTemplates = new Set();
    let insertedTemplateCount = 0;
    let updatedTemplateCount = 0;
    let insertedTemplateDataCount = 0;
    let insertedTemplateVariableCount = 0;
    let updatedTemplateVariableCount = 0;

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

      // Check for duplicates
      const uniqueKey = `${category}::${template_name}::${phonenumber}`;
      if (seenTemplates.has(uniqueKey)) continue;
      seenTemplates.add(uniqueKey);

      // Check if template already exists in database
      const [existingTemplate] = await connection.execute(
        `SELECT template_id FROM template WHERE store_id = ? AND category = ? AND template_name = ? AND phonenumber = ?`,
        [store_id, category, template_name, phonenumber]
      );

      let templateId;

      if (existingTemplate.length > 0) {
        // Template exists, update timestamp
        templateId = existingTemplate[0].template_id;
        
        await connection.execute(
          `UPDATE template SET updated_at = CURRENT_TIMESTAMP() WHERE template_id = ?`,
          [templateId]
        );
        updatedTemplateCount++;
      } else {
        // Insert new template
        const [templateInsertResult] = await connection.execute(
          `INSERT INTO template (store_id, category, template_name, phonenumber, created_at, updated_at)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())`,
          [store_id, category, template_name, phonenumber]
        );

        templateId = templateInsertResult.insertId;
        insertedTemplateCount++;
      }

      // Handle template_data
      if (Array.isArray(components)) {
        const content = JSON.stringify(components);

        console.log("Processing template content:", template_name);

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

        // Process template variables
        for (const component of components) {
          const { type, format } = component;

          if (!type) continue;

          let variables = [];

          // Extract variables based on component type
          switch (type) {
            case 'HEADER':
              if (format === 'TEXT' && component.text) {
                variables = extractVariables(component.text);
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

          // Handle individual variables
          for (const variable of variables) {
            const [existingVariable] = await connection.execute(
              `SELECT template_variable_id, mapping_field, fallback_value FROM template_variable 
               WHERE template_data_id = ? AND variable_name = ? AND component_type = ?`,
              [templateDataId, variable, type]
            );

            if (existingVariable.length > 0) {
              // Variable exists, only update timestamp if no mapping data exists
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

          // Handle full component data
          const componentType = `${type}_COMPONENT`;
          
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
      success: true,
      message: 'Templates synced successfully',
      data: {
        newTemplates: insertedTemplateCount,
        updatedTemplates: updatedTemplateCount,
        newTemplateData: insertedTemplateDataCount,
        newVariables: insertedTemplateVariableCount,
        updatedVariables: updatedTemplateVariableCount,
        totalProcessed: templates.length
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Template sync error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Error syncing templates',
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}