import pool from "@/lib/db"; // Use connection pool
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

    // Use connection pool instead of creating new connection
    connection = await pool.getConnection();

    // Fetch store data including existing brand_name and public_shop_url
    const [rows] = await connection.execute(
      'SELECT company_id, whatsapp_api_key, brand_name, public_shop_url FROM stores WHERE id = ?',
      [storeId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ message: 'Store not found' }, { status: 404 });
    }

    const { company_id, whatsapp_api_key, brand_name: existingBrandName, public_shop_url: existingPublicUrl } = rows[0];

    // Use existing values as fallback if new values are not provided
    const finalBrandName = brandName !== null && brandName !== undefined && brandName !== '' ? brandName : existingBrandName;
    const finalPublicUrl = publicUrl !== null && publicUrl !== undefined && publicUrl !== '' ? publicUrl : existingPublicUrl;

    // Start transaction
    await connection.beginTransaction();

    try {
      // 1. Update store with preserved values
      const [updateResult] = await connection.execute(
        `UPDATE stores SET countrycode = ?, public_shop_url = ?, brand_name = ?, phonenumber = ?, phone_number_id = ?, waba_id = ? WHERE id = ?`,
        [countrycode, finalPublicUrl, finalBrandName, phonenumber, phone_number_id, waba_id, storeId]
      );

      if (updateResult.affectedRows === 0) {
        await connection.rollback();
        return NextResponse.json({ message: 'No matching store found' }, { status: 404 });
      }

      // 2. Fetch from API with timeout
      const templateApiUrl = `${process.env.NEXT_PUBLIC_BASEURL}/chat/templates?waba_id=${waba_id}&limit=100&offset=0`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // Reduced to 10 seconds

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
        await connection.rollback();
        throw error;
      }

      if (!response.ok) {
        await connection.rollback();
        return NextResponse.json({ message: 'Failed to fetch templates from external API' }, { status: 500 });
      }

      const data = await response.json();

      if (!data?.data?.results?.length) {
        await connection.commit();
        return NextResponse.json({ message: 'No templates found from external API' }, { status: 200 });
      }

      const templates = data.data.results;
      const approvedTemplates = templates.filter(template => 
        template.waba_template_status === 'approved' && template.name && template.category
      );

      console.log(`Total templates: ${templates.length}, Approved templates: ${approvedTemplates.length}`);

      if (approvedTemplates.length === 0) {
        await connection.commit();
        return NextResponse.json({ 
          message: 'No approved templates found',
          totalTemplates: templates.length,
          approvedTemplates: 0
        }, { status: 200 });
      }

      // 3. Get existing templates and their mappings in one query
      const [existingData] = await connection.execute(`
        SELECT 
          t.template_id, 
          t.category, 
          t.template_name,
          td.template_data_id,
          tv.variable_name,
          tv.component_type,
          tv.type,
          tv.mapping_field,
          tv.fallback_value
        FROM template t 
        LEFT JOIN template_data td ON t.template_id = td.template_id
        LEFT JOIN template_variable tv ON td.template_data_id = tv.template_data_id
        WHERE t.store_id = ? AND t.phonenumber = ?
      `, [storeId, phonenumber]);

      // Build lookup maps
      const existingTemplateMap = new Map();
      const existingTemplateDataMap = new Map();
      const existingMappingMap = new Map();

      existingData.forEach(row => {
        const templateKey = `${row.category}::${row.template_name}`;
        existingTemplateMap.set(templateKey, {
          template_id: row.template_id,
          template_data_id: row.template_data_id
        });

        if (row.template_data_id) {
          existingTemplateDataMap.set(row.template_id, row.template_data_id);
        }

        if (row.variable_name || row.component_type) {
          const mappingKey = `${row.template_data_id}::${row.variable_name || ''}::${row.component_type}::${row.type}`;
          existingMappingMap.set(mappingKey, {
            mapping_field: row.mapping_field,
            fallback_value: row.fallback_value
          });
        }
      });

      // Prepare batch operations
      const templateInserts = [];
      const templateUpdates = [];
      const templateDataInserts = [];
      const templateDataUpdates = [];
      const variableDeletes = new Set();
      const variableInserts = [];

      // Counters
      let insertedTemplateCount = 0;
      let insertedTemplateDataCount = 0;
      let insertedVariableCount = 0;
      let skippedTemplateCount = 0;

      const seenTemplates = new Set();

      // 4. Process each approved template and prepare batch operations
      for (const template of approvedTemplates) {
        try {
          const { name: template_name, category, components } = template;
          const uniqueKey = `${category}::${template_name}`;
          
          if (seenTemplates.has(uniqueKey)) continue;
          seenTemplates.add(uniqueKey);

          const existingTemplate = existingTemplateMap.get(uniqueKey);
          let templateId = existingTemplate?.template_id;
          let templateDataId = existingTemplate?.template_data_id;

          if (templateId) {
            templateUpdates.push([templateId]);
          } else {
            templateInserts.push([storeId, category, template_name, phonenumber]);
            insertedTemplateCount++;
          }

          // Prepare template_data operations
          if (Array.isArray(components)) {
            const content = JSON.stringify(components);

            if (templateDataId) {
              templateDataUpdates.push([content, storeId, templateDataId]);
            } else {
              // We'll need to handle this after template inserts
              templateDataInserts.push({
                templateKey: uniqueKey,
                content,
                storeId,
                phonenumber
              });
              insertedTemplateDataCount++;
            }

            // Prepare variable operations
            if (templateDataId) {
              variableDeletes.add(templateDataId);
            }

            // Process components for variables
            const variablesForThisTemplate = [];
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

              // Prepare individual variables
              for (const variable of variables) {
                const mappingKey = `${templateDataId}::${variable}::${type}::${type}`;
                const existingMapping = existingMappingMap.get(mappingKey);
                
                variablesForThisTemplate.push({
                  templateDataId: templateDataId || uniqueKey, // Use key for new templates
                  type,
                  value: null,
                  variable_name: variable,
                  component_type: type,
                  mapping_field: existingMapping?.mapping_field || null,
                  fallback_value: existingMapping?.fallback_value || null,
                  phonenumber
                });
                insertedVariableCount++;
              }

              // Prepare component data
              const componentType = `${type}_COMPONENT`;
              const componentMappingKey = `${templateDataId}::::${type}::${componentType}`;
              const existingComponentMapping = existingMappingMap.get(componentMappingKey);
              
              variablesForThisTemplate.push({
                templateDataId: templateDataId || uniqueKey,
                type: componentType,
                value: JSON.stringify(component),
                variable_name: null,
                component_type: type,
                mapping_field: existingComponentMapping?.mapping_field || null,
                fallback_value: existingComponentMapping?.fallback_value || null,
                phonenumber
              });
              insertedVariableCount++;
            }

            // Store variables for later processing
            variableInserts.push(...variablesForThisTemplate);
          }

        } catch (templateError) {
          console.error(`Error processing template ${template.name}:`, templateError);
          skippedTemplateCount++;
        }
      }

      // 5. Execute batch operations
      
      // Update existing templates
      if (templateUpdates.length > 0) {
        for (const params of templateUpdates) {
          await connection.execute(
            `UPDATE template SET updated_at = NOW() WHERE template_id = ?`,
            params
          );
        }
      }

      // Insert new templates
      if (templateInserts.length > 0) {
        const templateValues = templateInserts.map(() => '(?, ?, ?, ?, NOW(), NOW())').join(', ');
        const flatTemplateParams = templateInserts.flat();
        
        const [templateResult] = await connection.execute(
          `INSERT INTO template (store_id, category, template_name, phonenumber, created_at, updated_at) VALUES ${templateValues}`,
          flatTemplateParams
        );

        // Map new template IDs to their keys
        const newTemplateIds = [];
        for (let i = 0; i < templateInserts.length; i++) {
          newTemplateIds.push(templateResult.insertId + i);
        }

        // Update templateDataInserts and variableInserts with actual IDs
        templateInserts.forEach((templateInsert, index) => {
          const [, category, template_name] = templateInsert;
          const uniqueKey = `${category}::${template_name}`;
          const newTemplateId = newTemplateIds[index];
          
          // Update template data inserts
          templateDataInserts.forEach(item => {
            if (item.templateKey === uniqueKey) {
              item.templateId = newTemplateId;
            }
          });

          // Update variable inserts
          variableInserts.forEach(item => {
            if (item.templateDataId === uniqueKey) {
              item.newTemplateId = newTemplateId;
            }
          });
        });
      }

      // Update existing template_data
      if (templateDataUpdates.length > 0) {
        for (const params of templateDataUpdates) {
          await connection.execute(
            `UPDATE template_data SET content = ?, updated_at = NOW() WHERE store_id = ? AND template_data_id = ?`,
            params
          );
        }
      }

      // Insert new template_data
      if (templateDataInserts.length > 0) {
        const templateDataValues = templateDataInserts.map(() => '(?, ?, ?, ?, NOW(), NOW())').join(', ');
        const flatTemplateDataParams = [];
        
        templateDataInserts.forEach(item => {
          flatTemplateDataParams.push(item.templateId, item.storeId, item.content, item.phonenumber);
        });
        
        const [templateDataResult] = await connection.execute(
          `INSERT INTO template_data (template_id, store_id, content, phonenumber, created_at, updated_at) VALUES ${templateDataValues}`,
          flatTemplateDataParams
        );

        // Update variable inserts with new template_data IDs
        templateDataInserts.forEach((item, index) => {
          const newTemplateDataId = templateDataResult.insertId + index;
          variableInserts.forEach(variable => {
            if (variable.newTemplateId === item.templateId) {
              variable.templateDataId = newTemplateDataId;
            }
          });
        });
      }

      // Delete existing variables (batch delete)
      if (variableDeletes.size > 0) {
        const deleteIds = Array.from(variableDeletes);
        const placeholders = deleteIds.map(() => '?').join(', ');
        await connection.execute(
          `DELETE FROM template_variable WHERE template_data_id IN (${placeholders}) AND store_id = ?`,
          [...deleteIds, storeId]
        );
      }

      // Insert new variables (batch insert)
      if (variableInserts.length > 0) {
        const variableValues = variableInserts.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())').join(', ');
        const flatVariableParams = [];
        
        variableInserts.forEach(variable => {
          flatVariableParams.push(
            variable.templateDataId,
            storeId,
            variable.type,
            variable.value,
            variable.variable_name,
            variable.component_type,
            variable.mapping_field,
            variable.fallback_value,
            variable.phonenumber
          );
        });
        
        await connection.execute(
          `INSERT INTO template_variable (
            template_data_id, store_id, type, value, variable_name, component_type, 
            mapping_field, fallback_value, phonenumber, created_at, updated_at
          ) VALUES ${variableValues}`,
          flatVariableParams
        );
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
        phonenumber: phonenumber,
        finalBrandName: finalBrandName,
        finalPublicUrl: finalPublicUrl
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
      connection.release(); // Use release() instead of end() with pool
    }
  }
}