import mysql from 'mysql2/promise';
import { NextResponse } from 'next/server';
import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const SECRET_KEY = Buffer.from(process.env.SECRET_KEY, "hex"); // 32 bytes

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

export async function POST(req) {
  let connection = null;
  const startTime = Date.now();
  
  try {
    const body = await req.json();
    const { storeToken, waba_id, phonenumber } = body;

    if (!storeToken) {
      return NextResponse.json({ message: 'Store token is required' }, { status: 400 });
    }
       
    // Decrypt the token to get the store ID
    let store_id;
    try {
      store_id = decrypt(storeToken);
    } catch (error) {
      return NextResponse.json({ message: 'Invalid store token' }, { status: 401 });
    }

    // Validate required fields
    if (!store_id || !waba_id || !phonenumber) {
      return new Response(JSON.stringify({ 
        success: false,
        message: 'Missing required fields: store_id, waba_id, and phonenumber are required' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create connection with optimized settings
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      acquireTimeout: 60000,
      timeout: 60000,
    });

    // Quick store verification
    const [storeExists] = await connection.execute(
      `SELECT id FROM stores WHERE id = ? LIMIT 1`,
      [store_id]
    );

    const [Validate] = await connection.execute(
      `SELECT company_id , whatsapp_api_key FROM stores WHERE id = ? LIMIT 1`,
      [store_id]
    );

    const { company_id, whatsapp_api_key } = Validate[0];

    if (storeExists.length === 0) {
      return new Response(JSON.stringify({ 
        success: false,
        message: 'Store not found' 
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch templates with timeout
    const templateApiUrl = `${process.env.NEXT_PUBLIC_BASEURL}/chat/templates?waba_id=${waba_id}&limit=50&offset=0`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

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
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout while fetching templates');
      }
      throw new Error(`Network error: ${fetchError.message}`);
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const data = await response.json();

    // Get existing templates for comparison (before filtering API results) - NOW WITH store_id
    const [existingTemplates] = await connection.execute(
      `SELECT template_id, template_name, category FROM template 
       WHERE store_id = ? AND phonenumber = ?`,
      [store_id, phonenumber]
    );

    const existingTemplateMap = new Map();
    existingTemplates.forEach(template => {
      const key = `${template.category}::${template.template_name}`;
      existingTemplateMap.set(key, template.template_id);
    });

    let insertedCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;
    const seenTemplates = new Set();

    if (!data?.data?.results?.length) {
      // If no templates from API, delete all existing templates
      if (existingTemplates.length > 0) {
        await connection.beginTransaction();
        try {
          deletedCount = await deleteTemplatesFromDatabase(connection, Array.from(existingTemplateMap.values()), store_id);
          await connection.commit();
        } catch (deleteError) {
          await connection.rollback();
          throw deleteError;
        }
      }

      return new Response(JSON.stringify({ 
        success: true,
        message: 'No templates found from API, cleaned up database',
        data: { 
          totalFromAPI: 0,
          approvedTemplates: 0,
          newTemplates: 0, 
          updatedTemplates: 0, 
          deletedTemplates: deletedCount,
          totalProcessed: deletedCount,
          executionTime: `${Date.now() - startTime}ms`
        }
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const templates = data.data.results;
    console.log(`Total templates from API: ${templates.length}`);
    
    // Filter only approved templates
    const approvedTemplates = templates.filter(template => 
      template.waba_template_status === 'approved'
    );

    console.log(`Approved templates: ${approvedTemplates.length}, Rejected/Other: ${templates.length - approvedTemplates.length}`);

    // Helper function to extract variables
    const extractVariables = (text) => {
      if (!text) return [];
      const matches = text.match(/\{\{([^}]+)\}\}/g);
      return matches ? matches.map(match => match.replace(/[{}]/g, '').trim()) : [];
    };

    // Create a set of current API template keys (approved templates only)
    const currentApiTemplateKeys = new Set();
    for (const template of approvedTemplates) {
      const { name: template_name, category, waba_template_status } = template;
      
      if (waba_template_status === 'approved' && template_name && category) {
        const uniqueKey = `${category}::${template_name}`;
        currentApiTemplateKeys.add(uniqueKey);
      }
    }

    // Find templates to delete (exist in DB but not in current API response)
    const templatesToDelete = [];
    for (const [templateKey, templateId] of existingTemplateMap.entries()) {
      if (!currentApiTemplateKeys.has(templateKey)) {
        templatesToDelete.push(templateId);
      }
    }

    // Process approved templates for insert/update
    const templateInserts = [];
    const templateUpdates = [];

    for (const template of approvedTemplates) {
      const { name: template_name, category, components, waba_template_status } = template;

      // Double check the status (redundant but safe)
      if (waba_template_status !== 'approved') {
        console.log(`Skipping template ${template_name} with status: ${waba_template_status}`);
        continue;
      }

      if (!template_name || !category) continue;

      const uniqueKey = `${category}::${template_name}`;
      if (seenTemplates.has(uniqueKey)) continue;
      seenTemplates.add(uniqueKey);

      const existingTemplateId = existingTemplateMap.get(uniqueKey);

      if (existingTemplateId) {
        templateUpdates.push(existingTemplateId);
        updatedCount++;
      } else {
        templateInserts.push({
          store_id,
          category,
          template_name,
          phonenumber,
          components: Array.isArray(components) ? components : []
        });
        insertedCount++;
      }
    }

    // Start transaction
    await connection.beginTransaction();

    try {
      // Delete templates that are no longer in API - NOW WITH store_id
      if (templatesToDelete.length > 0) {
        console.log(`Deleting ${templatesToDelete.length} templates that are no longer in API`);
        deletedCount = await deleteTemplatesFromDatabase(connection, templatesToDelete, store_id);
      }

      // Batch update existing templates - NOW WITH store_id validation
      if (templateUpdates.length > 0) {
        const placeholders = templateUpdates.map(() => '?').join(',');
        await connection.execute(
          `UPDATE template SET updated_at = CURRENT_TIMESTAMP() 
           WHERE template_id IN (${placeholders}) AND store_id = ?`,
          [...templateUpdates, store_id]
        );
      }

      // Batch insert new templates
      if (templateInserts.length > 0) {
        for (const templateData of templateInserts) {
          // Insert template
          const [templateResult] = await connection.execute(
            `INSERT INTO template (store_id, category, template_name, phonenumber, created_at, updated_at) 
             VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())`,
            [templateData.store_id, templateData.category, templateData.template_name, templateData.phonenumber]
          );

          const templateId = templateResult.insertId;

          // Insert template_data if components exist - NOW WITH store_id
          if (templateData.components.length > 0) {
            const content = JSON.stringify(templateData.components);
            
            const [templateDataResult] = await connection.execute(
              `INSERT INTO template_data (template_id, content, phonenumber, store_id, created_at, updated_at)
               VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())`,
              [templateId, content, templateData.phonenumber, templateData.store_id]
            );

            const templateDataId = templateDataResult.insertId;

            // Process variables for this template - NOW WITH store_id
            await processTemplateVariables(connection, templateData.components, templateDataId, templateData.phonenumber, templateData.store_id, extractVariables);
          }
        }
      }

      await connection.commit();

      const executionTime = Date.now() - startTime;
      console.log(`Sync completed in ${executionTime}ms`);

      return new Response(JSON.stringify({
        success: true,
        message: 'Templates synced successfully',
        data: {
          totalFromAPI: templates.length,
          approvedTemplates: approvedTemplates.length,
          rejectedTemplates: templates.length - approvedTemplates.length,
          newTemplates: insertedCount,
          updatedTemplates: updatedCount,
          deletedTemplates: deletedCount,
          totalProcessed: approvedTemplates.length + deletedCount,
          executionTime: `${executionTime}ms`
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (transactionError) {
      await connection.rollback();
      throw transactionError;
    }

  } catch (error) {
    console.error('Template sync error:', error);
    
    const isTimeout = error.name === 'AbortError' || error.message.includes('timeout');
    const isNetworkError = error.message.includes('Network error') || error.message.includes('fetch');
    
    let errorMessage = 'Error syncing templates';
    let statusCode = 500;
    
    if (isTimeout) {
      errorMessage = 'Request timeout - external API took too long to respond';
      statusCode = 408;
    } else if (isNetworkError) {
      errorMessage = 'Network error while fetching templates';
      statusCode = 502;
    } else {
      errorMessage = `Sync failed: ${error.message}`;
    }
    
    return new Response(JSON.stringify({
      success: false,
      message: errorMessage,
      error: error.message,
      executionTime: `${Date.now() - startTime}ms`
    }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
  }
}

// Helper function to delete templates and all related data - NOW WITH store_id
async function deleteTemplatesFromDatabase(connection, templateIds, store_id) {
  if (templateIds.length === 0) return 0;

  try {
    const placeholders = templateIds.map(() => '?').join(',');
    
    // Get template_data_ids for these templates - NOW WITH store_id validation
    const [templateDataRows] = await connection.execute(
      `SELECT template_data_id FROM template_data 
       WHERE template_id IN (${placeholders}) AND store_id = ?`,
      [...templateIds, store_id]
    );
    
    const templateDataIds = templateDataRows.map(row => row.template_data_id);
    
    // Delete template variables first (child records) - NOW WITH store_id validation
    if (templateDataIds.length > 0) {
      const templateDataPlaceholders = templateDataIds.map(() => '?').join(',');
      await connection.execute(
        `DELETE FROM template_variable 
         WHERE template_data_id IN (${templateDataPlaceholders}) AND store_id = ?`,
        [...templateDataIds, store_id]
      );
      console.log(`Deleted template variables for ${templateDataIds.length} template_data records`);
    }
    
    // Delete template_data records - NOW WITH store_id validation
    await connection.execute(
      `DELETE FROM template_data 
       WHERE template_id IN (${placeholders}) AND store_id = ?`,
      [...templateIds, store_id]
    );
    console.log(`Deleted template_data for ${templateIds.length} templates`);
    
    // Delete templates - Already has store_id validation in existing query
    const [deleteResult] = await connection.execute(
      `DELETE FROM template 
       WHERE template_id IN (${placeholders}) AND store_id = ?`,
      [...templateIds, store_id]
    );
    
    console.log(`Deleted ${deleteResult.affectedRows} templates from database`);
    return deleteResult.affectedRows;
    
  } catch (error) {
    console.error('Error deleting templates from database:', error);
    throw error;
  }
}

// Helper function to process template variables - NOW WITH store_id
async function processTemplateVariables(connection, components, templateDataId, phonenumber, store_id, extractVariables) {
  try {
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

      // Insert individual variables - NOW WITH store_id
      for (const variable of variables) {
        try {
          await connection.execute(
            `INSERT IGNORE INTO template_variable 
             (template_data_id, type, value, variable_name, component_type, mapping_field, fallback_value, phonenumber, store_id, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())`,
            [templateDataId, type, null, variable, type, null, null, phonenumber, store_id]
          );
        } catch (variableError) {
          console.error('Error inserting variable:', variableError);
          // Continue with other variables
        }
      }

      // Insert component data - NOW WITH store_id
      const componentType = `${type}_COMPONENT`;
      try {
        await connection.execute(
          `INSERT IGNORE INTO template_variable 
           (template_data_id, type, value, variable_name, component_type, mapping_field, fallback_value, phonenumber, store_id, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())`,
          [templateDataId, componentType, JSON.stringify(component), null, type, null, null, phonenumber, store_id]
        );
      } catch (componentError) {
        console.error('Error inserting component:', componentError);
        // Continue processing
      }
    }
  } catch (error) {
    console.error('Error processing template variables:', error);
    throw error;
  }
}