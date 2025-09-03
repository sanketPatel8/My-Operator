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

// Process template components and extract variables
function processTemplateComponents(components, templateDataId, phonenumber) {
  const templateVariables = [];
  
  if (!Array.isArray(components)) return templateVariables;

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

    // Add individual variables
    for (const variable of variables) {
      templateVariables.push({
        template_data_id: templateDataId,
        type: type,
        value: null,
        variable_name: variable,
        component_type: type,
        mapping_field: null,
        fallback_value: null,
        phonenumber: phonenumber,
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    // Add component data
    const componentType = `${type}_COMPONENT`;
    templateVariables.push({
      template_data_id: templateDataId,
      type: componentType,
      value: JSON.stringify(component),
      variable_name: null,
      component_type: type,
      mapping_field: null,
      fallback_value: null,
      phonenumber: phonenumber,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  return templateVariables;
}

export async function POST(req) {
  let connection;
  
  try {
    const body = await req.json();
    const { storeToken, brandName, publicUrl, countrycode, phonenumber, phone_number_id, waba_id } = body;

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

    // Create database connection with optimized settings
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      // Optimization: Enable multiple statements and increase packet size
      multipleStatements: true,
      maxAllowedPacket: 1024 * 1024 * 16, // 16MB
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

    // Start transaction for better performance and data consistency
    await connection.beginTransaction();

    try {
      // 1. Update store (single query)
      const [updateResult] = await connection.execute(
        `UPDATE stores SET countrycode = ?, public_shop_url = ?, brand_name = ?, phonenumber = ?, phone_number_id = ?, waba_id = ? WHERE id = ?`,
        [countrycode, publicUrl, brandName, phonenumber, phone_number_id, waba_id, storeId]
      );

      if (updateResult.affectedRows === 0) {
        await connection.rollback();
        await connection.end();
        return NextResponse.json({ message: 'No matching store found' }, { status: 404 });
      }

      // 2. Fetch from API with timeout
      const templateApiUrl = `${process.env.NEXT_PUBLIC_BASEURL}/chat/templates?waba_id=${waba_id}&limit=100&offset=0`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

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

      // 3. OPTIMIZATION: Get existing templates in one query
      const templateNames = approvedTemplates.map(t => t.name).filter(Boolean);
      const categories = approvedTemplates.map(t => t.category).filter(Boolean);
      
      const [existingTemplates] = await connection.execute(
        `SELECT template_id, category, template_name, phonenumber 
         FROM template 
         WHERE store_id = ? AND phonenumber = ? 
         AND template_name IN (${templateNames.map(() => '?').join(',')}) 
         AND category IN (${categories.map(() => '?').join(',')})`,
        [storeId, phonenumber, ...templateNames, ...categories]
      );

      // Create lookup maps for existing data
      const existingTemplateMap = new Map();
      existingTemplates.forEach(row => {
        const key = `${row.category}::${row.template_name}::${row.phonenumber}`;
        existingTemplateMap.set(key, row.template_id);
      });

      // Prepare batch insert arrays
      const templatesToInsert = [];
      const templateDataToInsert = [];
      const templateDataToUpdate = [];
      const templatesToUpdate = [];
      
      let insertedTemplateCount = 0;
      let insertedTemplateDataCount = 0;
      let skippedTemplateCount = 0;
      
      const seenTemplates = new Set();
      const templateDataMap = new Map(); // To store templateDataId for variables

      // Process templates
      for (const template of approvedTemplates) {
        const { name: template_name, category, components, waba_template_status } = template;

        if (waba_template_status !== 'approved' || !template_name || !category) {
          skippedTemplateCount++;
          continue;
        }

        const uniqueKey = `${category}::${template_name}::${phonenumber}`;
        if (seenTemplates.has(uniqueKey)) continue;
        seenTemplates.add(uniqueKey);

        const existingTemplateId = existingTemplateMap.get(uniqueKey);
        let templateId;

        if (existingTemplateId) {
          // Template exists, prepare for update
          templateId = existingTemplateId;
          templatesToUpdate.push([templateId]);
        } else {
          // New template, prepare for insert
          templateId = `temp_${insertedTemplateCount}`; // Temporary ID
          templatesToInsert.push([storeId, category, template_name, phonenumber]);
          insertedTemplateCount++;
        }

        // Handle template_data
        if (Array.isArray(components)) {
          const content = JSON.stringify(components);
          templateDataMap.set(templateId, {
            content,
            components,
            isNew: !existingTemplateId
          });
        }
      }

      // 4. BATCH INSERT/UPDATE templates
      if (templatesToInsert.length > 0) {
        const insertQuery = `INSERT INTO template (store_id, category, template_name, phonenumber, created_at, updated_at) VALUES ?`;
        const insertValues = templatesToInsert.map(row => [...row, new Date(), new Date()]);
        await connection.query(insertQuery, [insertValues]);
      }

      if (templatesToUpdate.length > 0) {
        const updateQuery = `UPDATE template SET updated_at = CURRENT_TIMESTAMP() WHERE template_id IN (${templatesToUpdate.map(() => '?').join(',')})`;
        await connection.execute(updateQuery, templatesToUpdate.flat());
      }

      // 5. Get template IDs for newly inserted templates
      if (templatesToInsert.length > 0) {
        const [newTemplates] = await connection.execute(
          `SELECT template_id, category, template_name, phonenumber 
           FROM template 
           WHERE store_id = ? AND phonenumber = ? 
           AND template_name IN (${templateNames.map(() => '?').join(',')})`,
          [storeId, phonenumber, ...templateNames]
        );

        // Update the template data map with actual IDs
        const newTemplateDataMap = new Map();
        for (const [tempId, data] of templateDataMap.entries()) {
          if (typeof tempId === 'string' && tempId.startsWith('temp_')) {
            // Find the actual template ID
            const index = parseInt(tempId.split('_')[1]);
            const templateRow = templatesToInsert[index];
            const actualTemplate = newTemplates.find(t => 
              t.category === templateRow[1] && 
              t.template_name === templateRow[2] && 
              t.phonenumber === templateRow[3]
            );
            if (actualTemplate) {
              newTemplateDataMap.set(actualTemplate.template_id, data);
            }
          } else {
            newTemplateDataMap.set(tempId, data);
          }
        }
        templateDataMap.clear();
        for (const [k, v] of newTemplateDataMap.entries()) {
          templateDataMap.set(k, v);
        }
      }

      // 6. Get existing template_data
      const templateIds = Array.from(templateDataMap.keys());
      const [existingTemplateData] = await connection.execute(
        `SELECT template_data_id, template_id FROM template_data WHERE template_id IN (${templateIds.map(() => '?').join(',')})`,
        templateIds
      );

      const existingTemplateDataMap = new Map();
      existingTemplateData.forEach(row => {
        existingTemplateDataMap.set(row.template_id, row.template_data_id);
      });

      // Prepare template_data operations
      const allTemplateVariables = [];

      for (const [templateId, data] of templateDataMap.entries()) {
        const existingDataId = existingTemplateDataMap.get(templateId);
        let templateDataId;

        if (existingDataId) {
          // Update existing template_data
          templateDataId = existingDataId;
          templateDataToUpdate.push([data.content, templateDataId]);
        } else {
          // Insert new template_data
          templateDataToInsert.push([templateId, data.content, phonenumber]);
          insertedTemplateDataCount++;
          templateDataId = `temp_data_${templateDataToInsert.length - 1}`;
        }

        // Process variables for this template
        const variables = processTemplateComponents(data.components, templateDataId, phonenumber);
        allTemplateVariables.push(...variables);
      }

      // 7. BATCH operations for template_data
      if (templateDataToInsert.length > 0) {
        const insertQuery = `INSERT INTO template_data (template_id, content, phonenumber, created_at, updated_at) VALUES ?`;
        const insertValues = templateDataToInsert.map(row => [...row, new Date(), new Date()]);
        await connection.query(insertQuery, [insertValues]);
      }

      if (templateDataToUpdate.length > 0) {
        const updatePromises = templateDataToUpdate.map(([content, id]) =>
          connection.execute(
            `UPDATE template_data SET content = ?, updated_at = CURRENT_TIMESTAMP() WHERE template_data_id = ?`,
            [content, id]
          )
        );
        await Promise.all(updatePromises);
      }

      // 8. Get actual template_data IDs for newly inserted records
      if (templateDataToInsert.length > 0) {
        const [newTemplateData] = await connection.execute(
          `SELECT template_data_id, template_id FROM template_data WHERE template_id IN (${templateIds.map(() => '?').join(',')})`,
          templateIds
        );

        // Update template variables with actual template_data_ids
        const actualDataIdMap = new Map();
        newTemplateData.forEach(row => {
          actualDataIdMap.set(row.template_id, row.template_data_id);
        });

        allTemplateVariables.forEach(variable => {
          if (typeof variable.template_data_id === 'string' && variable.template_data_id.startsWith('temp_data_')) {
            const index = parseInt(variable.template_data_id.split('_')[2]);
            const templateId = templateDataToInsert[index][0];
            variable.template_data_id = actualDataIdMap.get(templateId) || existingTemplateDataMap.get(templateId);
          }
        });
      }

      // 9. Handle template variables - delete existing and insert new (simpler than complex upsert logic)
      if (templateIds.length > 0) {
        await connection.execute(
          `DELETE FROM template_variable WHERE template_data_id IN (
            SELECT template_data_id FROM template_data WHERE template_id IN (${templateIds.map(() => '?').join(',')})
          )`,
          templateIds
        );
      }

      // 10. BATCH INSERT template variables
      let insertedVariableCount = 0;
      if (allTemplateVariables.length > 0) {
        const validVariables = allTemplateVariables.filter(v => v.template_data_id);
        
        if (validVariables.length > 0) {
          const insertQuery = `INSERT INTO template_variable (
            template_data_id, type, value, variable_name, component_type, 
            mapping_field, fallback_value, phonenumber, created_at, updated_at
          ) VALUES ?`;
          
          const insertValues = validVariables.map(v => [
            v.template_data_id, v.type, v.value, v.variable_name, v.component_type,
            v.mapping_field, v.fallback_value, v.phonenumber, v.created_at, v.updated_at
          ]);
          
          await connection.query(insertQuery, [insertValues]);
          insertedVariableCount = validVariables.length;
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
        updatedVariableCount: 0, // We're doing delete/insert instead of update
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