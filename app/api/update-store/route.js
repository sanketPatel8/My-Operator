import pool from "@/lib/db";
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

// Optimized variable extraction
function extractVariables(text) {
  if (!text) return [];
  return Array.from(text.matchAll(/\{\{([^}]+)\}\}/g), match => match[1].trim());
}

// Process template components efficiently
function processComponents(components) {
  const allVariables = [];
  const componentData = [];

  for (const component of components) {
    const { type, format } = component;
    if (!type) continue;

    let variables = [];

    // Simplified component processing
    if ((type === 'HEADER' && format === 'TEXT' && component.text) || 
        (type === 'BODY' && component.text) ||
        (type !== 'HEADER' && type !== 'BUTTONS' && component.text)) {
      variables = extractVariables(component.text);
    } else if (type === 'BUTTONS' && component.buttons?.length) {
      variables = component.buttons.map(btn => btn.text).filter(Boolean);
    }

    // Add variables
    allVariables.push(...variables.map(variable => ({
      type,
      value: null,
      variable_name: variable,
      component_type: type
    })));

    // Add component data
    componentData.push({
      type: `${type}_COMPONENT`,
      value: JSON.stringify(component),
      variable_name: null,
      component_type: type
    });
  }

  return [...allVariables, ...componentData];
}

export async function POST(req) {
  let connection;
  const startTime = Date.now();
  
  try {
    const body = await req.json();
    let { storeToken, brandName = null, publicUrl = null, countrycode, phonenumber, phone_number_id, waba_id } = body;

    if (!storeToken) {
      return NextResponse.json({ message: 'Store token is required' }, { status: 400 });
    }

    // Decrypt token
    let storeId;
    try {
      storeId = decrypt(storeToken);
    } catch (error) {
      return NextResponse.json({ message: 'Invalid store token' }, { status: 401 });
    }

    // Get connection from pool
    connection = await pool.getConnection();

    // Get store info
    const [rows] = await connection.execute(
      'SELECT company_id, whatsapp_api_key, brand_name, public_shop_url FROM stores WHERE id = ?',
      [storeId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ message: 'Store not found' }, { status: 404 });
    }

    const { company_id, whatsapp_api_key, brand_name: existingBrandName, public_shop_url: existingPublicUrl } = rows[0];
    const finalBrandName = brandName || existingBrandName;
    const finalPublicUrl = publicUrl || existingPublicUrl;

    // Start transaction
    await connection.beginTransaction();

    try {
      // Update store
      const [updateResult] = await connection.execute(
        `UPDATE stores SET countrycode = ?, public_shop_url = ?, brand_name = ?, phonenumber = ?, phone_number_id = ?, waba_id = ? WHERE id = ?`,
        [countrycode, finalPublicUrl, finalBrandName, phonenumber, phone_number_id, waba_id, storeId]
      );

      if (updateResult.affectedRows === 0) {
        await connection.rollback();
        return NextResponse.json({ message: 'No matching store found' }, { status: 404 });
      }

      // Fetch templates from API with reduced timeout
      const templateApiUrl = `${process.env.NEXT_PUBLIC_BASEURL}/chat/templates?waba_id=${waba_id}&limit=100&offset=0`;
      
      const response = await Promise.race([
        fetch(templateApiUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${whatsapp_api_key}`,
            'X-MYOP-COMPANY-ID': `${company_id}`,
          },
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('API timeout')), 8000)) // 8 second timeout
      ]);

      if (!response.ok) {
        await connection.rollback();
        return NextResponse.json({ message: 'Failed to fetch templates from external API' }, { status: 500 });
      }

      const data = await response.json();
      const templates = data?.data?.results || [];
      
      // Filter approved templates immediately
      const approvedTemplates = templates.filter(t => 
        t.waba_template_status === 'approved' && t.name && t.category && t.components?.length
      );

      if (approvedTemplates.length === 0) {
        await connection.commit();
        return NextResponse.json({ 
          message: 'No approved templates found',
          totalTemplates: templates.length,
          approvedTemplates: 0
        });
      }

      // Get existing data with optimized query
      const [existingData] = await connection.execute(`
        SELECT 
          CONCAT(t.category, '::', t.template_name) as template_key,
          t.template_id,
          td.template_data_id,
          CONCAT(COALESCE(tv.variable_name, ''), '::', tv.component_type, '::', tv.type) as var_key,
          tv.mapping_field,
          tv.fallback_value
        FROM template t 
        LEFT JOIN template_data td ON t.template_id = td.template_id
        LEFT JOIN template_variable tv ON td.template_data_id = tv.template_data_id
        WHERE t.store_id = ? AND t.phonenumber = ?
      `, [storeId, phonenumber]);

      // Build lookup maps efficiently
      const templateMap = new Map();
      const mappingMap = new Map();

      for (const row of existingData) {
        if (row.template_id) {
          templateMap.set(row.template_key, {
            template_id: row.template_id,
            template_data_id: row.template_data_id
          });
        }
        if (row.template_data_id && row.var_key) {
          mappingMap.set(`${row.template_data_id}::${row.var_key}`, {
            mapping_field: row.mapping_field,
            fallback_value: row.fallback_value
          });
        }
      }

      // Process templates and prepare batch operations
      const operations = {
        templateInserts: [],
        templateUpdates: [],
        templateDataOps: [],
        variableDeletes: new Set(),
        variableInserts: []
      };

      let insertedTemplateCount = 0;
      let insertedTemplateDataCount = 0;
      let insertedVariableCount = 0;
      const seenTemplates = new Set();

      for (const template of approvedTemplates) {
        const { name: template_name, category, components } = template;
        const templateKey = `${category}::${template_name}`;
        
        if (seenTemplates.has(templateKey)) continue;
        seenTemplates.add(templateKey);

        const existing = templateMap.get(templateKey);
        let templateId = existing?.template_id;
        let templateDataId = existing?.template_data_id;

        // Prepare template operations
        if (templateId) {
          operations.templateUpdates.push(templateId);
        } else {
          operations.templateInserts.push({
            key: templateKey,
            params: [storeId, category, template_name, phonenumber]
          });
          insertedTemplateCount++;
        }

        // Process components
        const content = JSON.stringify(components);
        const variables = processComponents(components);

        // Prepare template data operations
        operations.templateDataOps.push({
          templateKey,
          templateId,
          templateDataId,
          content,
          isNew: !templateDataId
        });

        if (!templateDataId) {
          insertedTemplateDataCount++;
        }

        // Prepare variable operations
        if (templateDataId) {
          operations.variableDeletes.add(templateDataId);
        }

        // Prepare variables with existing mappings
        for (const variable of variables) {
          const varKey = `${variable.variable_name || ''}::${variable.component_type}::${variable.type}`;
          const mappingKey = `${templateDataId}::${varKey}`;
          const existingMapping = mappingMap.get(mappingKey);

          operations.variableInserts.push({
            templateKey,
            templateDataId,
            ...variable,
            mapping_field: existingMapping?.mapping_field || null,
            fallback_value: existingMapping?.fallback_value || null,
            phonenumber
          });
          insertedVariableCount++;
        }
      }

      // Execute batch operations with maximum efficiency

      // 1. Update existing templates (batch)
      if (operations.templateUpdates.length > 0) {
        const placeholders = operations.templateUpdates.map(() => '?').join(',');
        await connection.execute(
          `UPDATE template SET updated_at = NOW() WHERE template_id IN (${placeholders})`,
          operations.templateUpdates
        );
      }

      // 2. Insert new templates (single batch)
      const templateIdMap = new Map();
      if (operations.templateInserts.length > 0) {
        const values = operations.templateInserts.map(() => '(?, ?, ?, ?, NOW(), NOW())').join(',');
        const params = operations.templateInserts.flatMap(op => op.params);
        
        const [result] = await connection.execute(
          `INSERT INTO template (store_id, category, template_name, phonenumber, created_at, updated_at) VALUES ${values}`,
          params
        );

        // Map template keys to new IDs
        operations.templateInserts.forEach((op, index) => {
          templateIdMap.set(op.key, result.insertId + index);
        });
      }

      // 3. Handle template_data operations (batch)
      const templateDataIdMap = new Map();
      const newTemplateDataOps = operations.templateDataOps.filter(op => op.isNew);
      const existingTemplateDataOps = operations.templateDataOps.filter(op => !op.isNew);

      // Update existing template_data
      if (existingTemplateDataOps.length > 0) {
        for (const op of existingTemplateDataOps) {
          await connection.execute(
            `UPDATE template_data SET content = ?, updated_at = NOW() WHERE template_data_id = ?`,
            [op.content, op.templateDataId]
          );
        }
      }

      // Insert new template_data
      if (newTemplateDataOps.length > 0) {
        const values = newTemplateDataOps.map(() => '(?, ?, ?, ?, NOW(), NOW())').join(',');
        const params = [];
        
        newTemplateDataOps.forEach(op => {
          const templateId = op.templateId || templateIdMap.get(op.templateKey);
          params.push(templateId, storeId, op.content, phonenumber);
        });

        const [result] = await connection.execute(
          `INSERT INTO template_data (template_id, store_id, content, phonenumber, created_at, updated_at) VALUES ${values}`,
          params
        );

        // Map to new template_data IDs
        newTemplateDataOps.forEach((op, index) => {
          templateDataIdMap.set(op.templateKey, result.insertId + index);
        });
      }

      // 4. Delete existing variables (batch)
      if (operations.variableDeletes.size > 0) {
        const placeholders = Array.from(operations.variableDeletes).map(() => '?').join(',');
        await connection.execute(
          `DELETE FROM template_variable WHERE template_data_id IN (${placeholders}) AND store_id = ?`,
          [...operations.variableDeletes, storeId]
        );
      }

      // 5. Insert variables (single large batch)
      if (operations.variableInserts.length > 0) {
        const values = operations.variableInserts.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())').join(',');
        const params = [];

        operations.variableInserts.forEach(variable => {
          const templateDataId = variable.templateDataId || templateDataIdMap.get(variable.templateKey);
          params.push(
            templateDataId,
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
          ) VALUES ${values}`,
          params
        );
      }

      await connection.commit();

      const executionTime = Date.now() - startTime;
      console.log(`API execution time: ${executionTime}ms`);

      return NextResponse.json({
        message: 'Store and templates updated successfully',
        totalTemplatesFromAPI: templates.length,
        approvedTemplates: approvedTemplates.length,
        templateCount: insertedTemplateCount,
        templateDataCount: insertedTemplateDataCount,
        insertedVariableCount: insertedVariableCount,
        executionTime: `${executionTime}ms`,
        phonenumber,
        finalBrandName,
        finalPublicUrl
      });

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
      connection.release();
    }
  }
}