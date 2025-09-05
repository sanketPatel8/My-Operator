import mysql from 'mysql2/promise';
import { NextResponse } from 'next/server';
import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const SECRET_KEY = Buffer.from(process.env.SECRET_KEY, "hex");

function decrypt(token) {
  try {
    const [ivHex, encryptedData] = token.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const encryptedText = Buffer.from(encryptedData, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    throw new Error("Invalid token");
  }
}

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

export async function POST(req) {
  let connection;
  
  try {
    const body = await req.json();
    let {
          storeToken,
          brandName = null,
          publicUrl = null,
          countrycode,
          phonenumber,
          phone_number_id,
          waba_id
        } = body;


    if (!storeToken) {
      return NextResponse.json({ message: 'Store token is required' }, { status: 400 });
    }

    // Decrypt the token to get the store ID
    let storeId;
    try {
      storeId = decrypt(storeToken);
    } catch (error) {
      return NextResponse.json({ message: 'Invalid store token' }, { status: 401 });
    }

    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    });

    // Fetch store data
    const [rows] = await connection.execute(
      'SELECT company_id, whatsapp_api_key FROM stores WHERE id = ?',
      [storeId]
    );

    if (rows.length === 0) {
      await connection.end();
      return NextResponse.json({ message: 'Store not found' }, { status: 404 });
    }

    const { company_id, whatsapp_api_key } = rows[0];

    // Start transaction
    await connection.beginTransaction();

    try {
      // 1. Update store
      const [updateResult] = await connection.execute(
        `UPDATE stores SET countrycode = ?, public_shop_url = ?, brand_name = ?, phonenumber = ?, phone_number_id = ?, waba_id = ? WHERE id = ?`,
        [countrycode, publicUrl, brandName, phonenumber, phone_number_id, waba_id, storeId]
      );

      if (updateResult.affectedRows === 0) {
        await connection.rollback();
        await connection.end();
        return NextResponse.json({ message: 'No matching store found' }, { status: 404 });
      }

      // 2. Fetch from API
      const templateApiUrl = `${process.env.NEXT_PUBLIC_BASEURL}/chat/templates?waba_id=${waba_id}&limit=100&offset=0`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      let response;
      try {
        response = await fetch(templateApiUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${whatsapp_api_key}`,
            'X-MYOP-COMPANY-ID': `${company_id}`,
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }

      if (!response.ok) {
        await connection.rollback();
        await connection.end();
        return NextResponse.json({ message: 'Failed to fetch templates from external API' }, { status: 500 });
      }

      const data = await response.json();

      if (!data?.data?.results?.length) {
        await connection.commit();
        await connection.end();
        return NextResponse.json({ message: 'No templates found from external API' }, { status: 200 });
      }

      const templates = data.data.results;
      const approvedTemplates = templates.filter(template => 
        template.waba_template_status === 'approved'
      );

      console.log(`Total templates: ${templates.length}, Approved templates: ${approvedTemplates.length}`);

      if (approvedTemplates.length === 0) {
        await connection.commit();
        await connection.end();
        return NextResponse.json({ 
          message: 'No approved templates found',
          totalTemplates: templates.length,
          approvedTemplates: 0
        }, { status: 200 });
      }

      // 3. Get existing templates to avoid duplicates
      const [existingTemplates] = await connection.execute(
        `SELECT template_id, category, template_name FROM template WHERE store_id = ? AND phonenumber = ?`,
        [storeId, phonenumber]
      );

      const existingTemplateMap = new Map();
      existingTemplates.forEach(row => {
        const key = `${row.category}::${row.template_name}`;
        existingTemplateMap.set(key, row.template_id);
      });

      // Counters
      let insertedTemplateCount = 0;
      let insertedTemplateDataCount = 0;
      let insertedVariableCount = 0;
      let updatedVariableCount = 0;
      let skippedTemplateCount = 0;

      const seenTemplates = new Set();

      // 4. Process each approved template
      for (const template of approvedTemplates) {
        try {
          const { name: template_name, category, components, waba_template_status } = template;

          if (waba_template_status !== 'approved' || !template_name || !category) {
            skippedTemplateCount++;
            continue;
          }

          const uniqueKey = `${category}::${template_name}`;
          if (seenTemplates.has(uniqueKey)) continue;
          seenTemplates.add(uniqueKey);

          let templateId = existingTemplateMap.get(uniqueKey);

          if (templateId) {
            // Update existing template timestamp
            await connection.execute(
              `UPDATE template SET updated_at = NOW() WHERE template_id = ?`,
              [templateId]
            );
          } else {
            // Insert new template
            const [templateInsertResult] = await connection.execute(
              `INSERT INTO template (store_id, category, template_name, phonenumber, created_at, updated_at) 
               VALUES (?, ?, ?, ?, NOW(), NOW())`,
              [storeId, category, template_name, phonenumber]
            );
            templateId = templateInsertResult.insertId;
            insertedTemplateCount++;
          }

          // 5. Handle template_data (now includes store_id)
          if (Array.isArray(components)) {
            const content = JSON.stringify(components);

            // Check if template_data exists
            const [existingTemplateData] = await connection.execute(
              `SELECT template_data_id FROM template_data WHERE template_id = ?`,
              [templateId]
            );

            let templateDataId;

            if (existingTemplateData.length > 0) {
              // Update existing template_data (including store_id)
              templateDataId = existingTemplateData[0].template_data_id;
              await connection.execute(
                `UPDATE template_data SET content = ?,  updated_at = NOW() WHERE store_id = ? AND template_data_id = ?`,
                [content, storeId, templateDataId]
              );
              
              
            } else {
              // Insert new template_data (now includes store_id)
              const [templateDataInsertResult] = await connection.execute(
                `INSERT INTO template_data (template_id, store_id, content, phonenumber, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, NOW(), NOW())`,
                [templateId, storeId, content, phonenumber]
              );
              templateDataId = templateDataInsertResult.insertId;
              insertedTemplateDataCount++;
            }

            // 6. Get existing variables with their mapping_field and fallback_value
            const [existingVariables] = await connection.execute(
              `SELECT variable_name, component_type, mapping_field, fallback_value, type 
               FROM template_variable 
               WHERE template_data_id = ? AND store_id = ?`,
              [templateDataId, storeId]
            );

            // Create a map to store existing mapping fields and fallback values
            const existingMappingMap = new Map();
            existingVariables.forEach(row => {
              const key = `${row.variable_name || ''}::${row.component_type}::${row.type}`;
              existingMappingMap.set(key, {
                mapping_field: row.mapping_field,
                fallback_value: row.fallback_value
              });
            });

            // 7. Clear existing variables for this template_data
            await connection.execute(
              `DELETE FROM template_variable WHERE template_data_id = ? AND store_id = ?`,
              [templateDataId, storeId]
            );

            // 8. Process components and insert variables (preserving mapping_field and fallback_value)
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

              // Insert individual variables (preserving mapping_field and fallback_value)
              for (const variable of variables) {
                const mappingKey = `${variable}::${type}::${type}`;
                const existingMapping = existingMappingMap.get(mappingKey);
                
                await connection.execute(
                  `INSERT INTO template_variable (
                    template_data_id, store_id, type, value, variable_name, component_type, 
                    mapping_field, fallback_value, phonenumber, created_at, updated_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                  [
                    templateDataId,
                    storeId,
                    type,
                    null,
                    variable,
                    type,
                    existingMapping?.mapping_field || null,
                    existingMapping?.fallback_value || null,
                    phonenumber
                  ]
                );
                insertedVariableCount++;
              }

              // Insert component data (preserving mapping_field and fallback_value)
              const componentType = `${type}_COMPONENT`;
              const componentMappingKey = `::${type}::${componentType}`;
              const existingComponentMapping = existingMappingMap.get(componentMappingKey);
              
              await connection.execute(
                `INSERT INTO template_variable (
                  template_data_id, store_id, type, value, variable_name, component_type, 
                  mapping_field, fallback_value, phonenumber, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [
                  templateDataId,
                  storeId,
                  componentType,
                  JSON.stringify(component),
                  null,
                  type,
                  existingComponentMapping?.mapping_field || null,
                  existingComponentMapping?.fallback_value || null,
                  phonenumber
                ]
              );
              insertedVariableCount++;
            }
          }

        } catch (templateError) {
          console.error(`Error processing template ${template.name}:`, templateError);
          skippedTemplateCount++;
          // Continue with next template instead of failing entirely
        }
      }

      // Commit transaction
      await connection.commit();

      const result = {
        message: 'Store and templates updated successfully',
        totalTemplatesFromAPI: templates.length,
        approvedTemplates: approvedTemplates.length,
        skippedTemplates: skippedTemplateCount,
        templateCount: insertedTemplateCount,
        templateDataCount: insertedTemplateDataCount,
        insertedVariableCount: insertedVariableCount,
        updatedVariableCount: updatedVariableCount,
        phonenumber: phonenumber
      };

      return NextResponse.json(result, { status: 200 });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({
      message: 'Error updating store and templates',
      error: error.message,
    }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}