import pool from "@/lib/db";
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
  let connection;
  
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

    // Use connection pool instead of creating new connection
    connection = await pool.getConnection();

    // Get store info first
    const [storeInfo] = await connection.execute(
      `SELECT phonenumber FROM stores WHERE id = ?`,
      [storeId]
    );

    if (storeInfo.length === 0) {
      return NextResponse.json({ message: 'Store not found' }, { status: 404 });
    }

    const currentStorePhoneNumber = storeInfo[0].phonenumber;

    if (!currentStorePhoneNumber) {
      return NextResponse.json({ 
        message: 'No phone number set for this store',
        templates: []
      }, { status: 200 });
    }

    // Single optimized query to get all data at once using JOINs
    const query = `
      SELECT 
        t.template_id,
        t.category,
        t.template_name,
        t.phonenumber,
        t.created_at as template_created_at,
        t.updated_at as template_updated_at,
        td.template_data_id,
        td.content,
        tv.template_variable_id,
        tv.type as variable_type,
        tv.value as variable_value,
        tv.variable_name,
        tv.component_type,
        tv.mapping_field,
        tv.fallback_value,
        tv.created_at as variable_created_at,
        tv.updated_at as variable_updated_at
      FROM template t 
      INNER JOIN stores s ON t.store_id = s.id 
      LEFT JOIN template_data td ON t.template_id = td.template_id
      LEFT JOIN template_variable tv ON td.template_data_id = tv.template_data_id
      WHERE t.store_id = ? AND t.phonenumber = ? AND s.phonenumber = ?
      ORDER BY t.template_id, td.template_data_id, tv.template_variable_id
    `;

    const [rows] = await connection.execute(query, [storeId, currentStorePhoneNumber, currentStorePhoneNumber]);

    if (rows.length === 0) {
      return NextResponse.json({ 
        message: 'No templates found',
        templates: []
      }, { status: 200 });
    }

    // Process results efficiently using Map for O(1) lookups
    const templatesMap = new Map();
    const templateDataMap = new Map();

    for (const row of rows) {
      const {
        template_id,
        category,
        template_name,
        phonenumber,
        template_created_at,
        template_updated_at,
        template_data_id,
        content,
        template_variable_id,
        variable_type,
        variable_value,
        variable_name,
        component_type,
        mapping_field,
        fallback_value,
        variable_created_at,
        variable_updated_at
      } = row;

      // Initialize template if not exists
      if (!templatesMap.has(template_id)) {
        templatesMap.set(template_id, {
          template_id,
          category,
          template_name,
          phonenumber,
          created_at: template_created_at,
          updated_at: template_updated_at,
          data: [],
          totalTemplateData: 0
        });
      }

      // Initialize template_data if not exists and template_data_id is not null
      if (template_data_id && !templateDataMap.has(template_data_id)) {
        const templateDataObj = {
          template_data_id,
          content: content ? JSON.parse(content) : null,
          componentVariables: [],
          mappingVariables: [],
          totalVariables: 0
        };
        
        templateDataMap.set(template_data_id, templateDataObj);
        templatesMap.get(template_id).data.push(templateDataObj);
        templatesMap.get(template_id).totalTemplateData++;
      }

      // Add variable if exists
      if (template_variable_id && template_data_id) {
        // Parse value if it's JSON string
        let parsedValue = variable_value;
        if (parsedValue && typeof parsedValue === 'string') {
          try {
            if (parsedValue.startsWith('{') || parsedValue.startsWith('[')) {
              parsedValue = JSON.parse(parsedValue);
            }
          } catch (e) {
            // If parsing fails, keep original value
            parsedValue = variable_value;
          }
        }

        const variableData = {
          template_variable_id,
          type: variable_type,
          value: parsedValue,
          variable_name,
          component_type,
          mapping_field,
          fallback_value,
          created_at: variable_created_at,
          updated_at: variable_updated_at
        };

        const templateDataObj = templateDataMap.get(template_data_id);
        
        // Categorize variables
        if (variable_type && variable_type.endsWith('_COMPONENT')) {
          templateDataObj.componentVariables.push(variableData);
        } else {
          templateDataObj.mappingVariables.push(variableData);
        }
        templateDataObj.totalVariables++;
      }
    }

    // Convert Map to Array
    const results = Array.from(templatesMap.values());

    return NextResponse.json({
      success: true,
      storeId: storeId,
      currentStorePhoneNumber: currentStorePhoneNumber,
      templates: results 
    });

  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({
      message: 'Error fetching templates',
      error: error.message,
    }, { status: 500 });
  } finally {
    // Always release connection back to pool
    if (connection) {
      connection.release();
    }
  }
}