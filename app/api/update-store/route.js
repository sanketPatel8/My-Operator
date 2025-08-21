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

    // 2. Clear old templates and their template_data + template_variable
    const [existingTemplates] = await connection.execute(
      `SELECT template_id FROM template WHERE store_id = ?`, [id]
    );

    const templateIds = existingTemplates.map(row => row.template_id);

    if (templateIds.length > 0) {
      const [templateDataRows] = await connection.execute(
        `SELECT template_data_id FROM template_data WHERE template_id IN (${templateIds.map(() => '?').join(',')})`,
        templateIds
      );

      const templateDataIds = templateDataRows.map(row => row.template_data_id);

      if (templateDataIds.length > 0) {
        await connection.execute(
          `DELETE FROM template_variable WHERE template_data_id IN (${templateDataIds.map(() => '?').join(',')})`,
          templateDataIds
        );
      }

      await connection.execute(
        `DELETE FROM template_data WHERE template_id IN (${templateIds.map(() => '?').join(',')})`,
        templateIds
      );
    }

    await connection.execute(`DELETE FROM template WHERE store_id = ?`, [id]);

    // 3. Fetch from API
    const templateApiUrl = `https://publicapi.myoperator.co/chat/templates?waba_id=${waba_id}&limit=100&offset=0`;

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

      const uniqueKey = `${category}::${template_name}`;
      if (seenTemplates.has(uniqueKey)) continue;
      seenTemplates.add(uniqueKey);

      // Insert into template
      const [templateInsertResult] = await connection.execute(
        `INSERT INTO template (store_id, category, template_name, created_at, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())`,
        [id, category, template_name]
      );

      const templateId = templateInsertResult.insertId;
      insertedTemplateCount++;

      // Insert into template_data
      if (Array.isArray(components)) {
        const content = JSON.stringify(components);

        console.log("content whole:::", content);

        const [templateDataInsertResult] = await connection.execute(
          `INSERT INTO template_data (template_id, content, created_at, updated_at)
           VALUES (?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())`,
          [templateId, content]
        );

        insertedTemplateDataCount++;
        const templateDataId = templateDataInsertResult.insertId;

        // Extract and insert variables by component type
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
                // For media headers, we might not have text variables
                // but we store the component info
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
                // Extract variables from button text
                component.buttons.forEach(button => {
                  if (button.text) {
                    variables.push(button.text);
                  }
                });
              }
              break;

            default:
              // Handle other types if needed
              if (component.text) {
                variables = extractVariables(component.text);
              }
              break;
          }

          // 1. Insert individual variables for mapping UI
          for (const variable of variables) {
            await connection.execute(
              `INSERT INTO template_variable (
                template_data_id, 
                type, 
                value, 
                variable_name, 
                component_type, 
                mapping_field, 
                fallback_value, 
                created_at, 
                updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())`,
              [
                templateDataId, 
                type,                    // Component type (HEADER, BODY, BUTTONS)
                null,                    // No JSON value for individual variables
                variable,                // Variable name extracted from {{variable}}
                type,                    // Same as type
                null,                    // Will be set by user later
                null,                    // Will be set by user later
              ]
            );
          }

          // 2. Store the full component data for reference (CORRECTED)
          await connection.execute(
            `INSERT INTO template_variable (
              template_data_id, 
              type, 
              value, 
              variable_name, 
              component_type, 
              mapping_field, 
              fallback_value, 
              created_at, 
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())`,
            [
              templateDataId, 
              `${type}_COMPONENT`,     // Type like "HEADER_COMPONENT"
              JSON.stringify(component), // Full component JSON
              null,                    // No variable name for component data
              type,                    // Original component type
              null,                    // Not applicable for component data
              null,                    // Not applicable for component data
            ]
          );
        }
      }
    }

    await connection.end();

    return new Response(JSON.stringify({
      message: 'Store, templates and template_data updated successfully',
      templateCount: insertedTemplateCount,
      templateDataCount: insertedTemplateDataCount,
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