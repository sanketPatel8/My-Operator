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

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const storeToken = searchParams.get('storeToken');

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

    

    const connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      charset: 'utf8mb4',
      collation: 'utf8mb4_unicode_ci',
    });

    // First get the current phone number from stores table
    const [storeInfo] = await connection.execute(
      `SELECT phonenumber FROM stores WHERE id = ?`,
      [storeId]
    );

    if (storeInfo.length === 0) {
      await connection.end();
      return new Response(JSON.stringify({ message: 'Store not found' }), { status: 404 });
    }

    const currentStorePhoneNumber = storeInfo[0].phonenumber;

    if (!currentStorePhoneNumber) {
      await connection.end();
      return new Response(JSON.stringify({ 
        message: 'No phone number set for this store',
        templates: []
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get templates for this store that match the current store's phone number
    let query = `
      SELECT t.* FROM template t 
      INNER JOIN stores s ON t.store_id = s.id 
      WHERE t.store_id = ? AND t.phonenumber = s.phonenumber
    `;
    let queryParams = [storeId];

    // If specific phone number is requested, add additional filter
    if (phonenumber) {
      query += ` AND t.phonenumber = ?`;
      queryParams.push(phonenumber);
    }

    // Get templates for this store (filtered by matching phone numbers)
    const [templates] = await connection.execute(query, queryParams);

    if (templates.length === 0) {
      await connection.end();
      return new Response(JSON.stringify({ 
        message: 'No templates found',
        templates: []
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const results = [];

    for (const template of templates) {
      const { template_id, category, template_name, phonenumber: templatePhone, created_at, updated_at } = template;

      // Get template_data for this template
      const [templateData] = await connection.execute(
        `SELECT * FROM template_data WHERE template_id = ?`,
        [template_id]
      );

      const dataWithVariables = [];

      for (const data of templateData) {
        const { template_data_id, content } = data;

        // Get template_variable for this template_data - explicitly select all fields including mapping_field and fallback_value
        const [variables] = await connection.execute(
          `SELECT 
            template_variable_id,
            template_data_id,
            type,
            value,
            variable_name,
            component_type,
            mapping_field,
            fallback_value,
            created_at,
            updated_at
          FROM template_variable 
          WHERE template_data_id = ?`,
          [template_data_id]
        );

        // Separate variables by type for better organization
        const componentVariables = [];
        const mappingVariables = [];

        for (const variable of variables) {
          // Parse value if it's JSON string
          let parsedValue = variable.value;
          if (parsedValue && typeof parsedValue === 'string') {
            try {
              if (parsedValue.startsWith('{') || parsedValue.startsWith('[')) {
                parsedValue = JSON.parse(parsedValue);
              }
            } catch (e) {
              // If parsing fails, keep original value
              parsedValue = variable.value;
            }
          }

          const variableData = {
            template_variable_id: variable.template_variable_id,
            type: variable.type,
            value: parsedValue,
            variable_name: variable.variable_name,
            component_type: variable.component_type,
            mapping_field: variable.mapping_field, // Explicitly include mapping_field
            fallback_value: variable.fallback_value, // Explicitly include fallback_value
            created_at: variable.created_at,
            updated_at: variable.updated_at
          };

          // If it's a component (ends with _COMPONENT), add to component variables
          if (variable.type && variable.type.endsWith('_COMPONENT')) {
            componentVariables.push(variableData);
          } else {
            // Regular mapping variables
            mappingVariables.push(variableData);
          }
        }

        dataWithVariables.push({
          template_data_id,
          content: content ? JSON.parse(content) : null,
          componentVariables,
          mappingVariables,
          totalVariables: variables.length
        });
      }

      results.push({
        template_id,
        category,
        template_name,
        phonenumber: templatePhone,
        created_at,
        updated_at,
        data: dataWithVariables,
        totalTemplateData: templateData.length
      });
    }

    await connection.end();

    return new Response(JSON.stringify({
      success: true,
      storeId: storeId,
      currentStorePhoneNumber: currentStorePhoneNumber,
      templates: results 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching templates:', error);
    return new Response(JSON.stringify({
      message: 'Error fetching templates',
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}