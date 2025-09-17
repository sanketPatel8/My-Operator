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

// CORS middleware
function setCORSHeaders(headers) {
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Max-Age', '86400');
}

export async function OPTIONS() {
  const headers = new Headers();
  setCORSHeaders(headers);
  return new Response(null, { status: 200, headers });
}

export async function POST(request) {
  let connection;

  
      const category_id = 61;

  try {
    const body = await request.json();
    const { 
      storeToken,
      title,
      subtitle,
      template,
      variableSettings,
      selectedEvent
    } = body;

    // Validate required fields
    if (!storeToken) {
      return NextResponse.json({ message: 'Store token is required' }, { status: 400 });
    }

    if (!category_id || !title || !template) {
      return NextResponse.json({ 
        message: 'Category ID, title, and template are required' 
      }, { status: 400 });
    }
    
    // Decrypt the token to get the store ID
    let STORE_ID;
    try {
      STORE_ID = decrypt(storeToken);
    } catch (error) {
      return NextResponse.json({ message: 'Invalid store token' }, { status: 401 });
    }

    connection = await pool.getConnection();
    const [countResult] = await connection.execute(
      'SELECT COUNT(*) as count FROM category_event WHERE category_id = 61 AND store_id = ?',
      [STORE_ID]
    );

    const currentCount = countResult[0].count;

    if (currentCount >= 3) {
      connection.release(); // Don't forget to release the connection
      const headers = new Headers();
      setCORSHeaders(headers);
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Maximum 3 custom workflows allowed per store'
      }), {
        status: 400,
        headers
      });
    }
    await connection.beginTransaction();

    // 1. Get phone number from stores table
    const [storeResult] = await connection.execute(
      'SELECT phonenumber FROM stores WHERE id = ?',
      [STORE_ID]
    );

    if (storeResult.length === 0) {
      throw new Error('Store not found');
    }

    const phoneNumber = storeResult[0].phonenumber;

    // 2. Get template details from template table
    const [templateResult] = await connection.execute(
      'SELECT template_id FROM template WHERE template_name = ? AND store_id = ?',
      [template, STORE_ID]
    );

    if (templateResult.length === 0) {
      throw new Error('Template not found for this store');
    }

    const templateId = templateResult[0].template_id;

    // 3. Get template_data_id and template_variable_id
    const [templateDataResult] = await connection.execute(
      'SELECT template_data_id FROM template_data WHERE template_id = ?',
      [templateId]
    );

    if (templateDataResult.length === 0) {
      throw new Error('Template data not found');
    }

    const templateDataId = templateDataResult[0].template_data_id;

    const [templateVariableResult] = await connection.execute(
      'SELECT template_variable_id FROM template_variable WHERE template_data_id = ?',
      [templateDataId]
    );

    const templateVariableIds = templateVariableResult.map(row => row.template_variable_id).join(',');

    // 4. Insert new category_event
    const [insertResult] = await connection.execute(
      `INSERT INTO category_event 
       (category_id, title, subtitle, template_id, template_data_id, template_variable_id, phonenumber, store_id, event_trigger, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        category_id,
        title,
        subtitle || null,
        templateId,
        templateDataId,
        templateVariableIds,
        phoneNumber,
        STORE_ID,
        selectedEvent
      ]
    );

    const categoryEventId = insertResult.insertId;

    // 5. Update template variables with mapping fields and fallback values
    if (variableSettings && templateVariableIds) {
      const variableIds = templateVariableIds.toString().split(',');
      
      for (const [variableName, settings] of Object.entries(variableSettings)) {
        // Find the corresponding template_variable_id for this variable
        const [variableResult] = await connection.execute(
          'SELECT template_variable_id FROM template_variable WHERE variable_name = ? AND template_variable_id IN (' + variableIds.map(() => '?').join(',') + ')',
          [variableName, ...variableIds]
        );

        if (variableResult.length > 0) {
          const varId = variableResult[0].template_variable_id;
          
          // Update the template_variable with mapping_field and fallback_value
          await connection.execute(
            'UPDATE template_variable SET mapping_field = ?, fallback_value = ?, updated_at = NOW() WHERE template_variable_id = ?',
            [
              settings.dropdown || null,
              settings.fallback || null,
              varId
            ]
          );
        }
      }
    }

    await connection.commit();

    const headers = new Headers();
    setCORSHeaders(headers);

    return new Response(JSON.stringify({
      success: true,
      message: 'Workflow created successfully',
      data: {
        category_event_id: categoryEventId,
        title,
        subtitle,
        template,
        template_id: templateId,
        template_data_id: templateDataId,
        template_variable_id: templateVariableIds,
        phonenumber: phoneNumber
      }
    }), {
      status: 200,
      headers
    });

  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError);
      }
    }
    console.error('POST /api/category error:', error);
    
    const headers = new Headers();
    setCORSHeaders(headers);

    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to create workflow',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }), { 
      status: 500,
      headers 
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export async function DELETE(request) {
  let connection;
  
  try {
    const body = await request.json();
    const { storeToken, category_event_id } = body;

    // Validate required fields
    if (!storeToken || !category_event_id) {
      return NextResponse.json({ 
        success: false, 
        message: 'Store token and category_event_id are required' 
      }, { status: 400 });
    }

    // Decrypt the token to get the store ID
    let STORE_ID;
    try {
      STORE_ID = decrypt(storeToken);
    } catch (error) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid store token' 
      }, { status: 401 });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Verify the workflow belongs to this store
    const [verifyResult] = await connection.execute(
      'SELECT category_event_id FROM category_event WHERE category_event_id = ? AND store_id = ?',
      [category_event_id, STORE_ID]
    );

    if (verifyResult.length === 0) {
      throw new Error('Workflow not found or unauthorized');
    }

    // Delete the workflow - CASCADE DELETE or manual cleanup
    // Option 1: Delete only the category_event (if you want to keep template data)
    await connection.execute(
      'DELETE FROM category_event WHERE category_event_id = ? AND store_id = ?',
      [category_event_id, STORE_ID]
    );

    
    /*
    await connection.execute(
      'DELETE FROM template_variable WHERE template_variable_id IN (SELECT template_variable_id FROM category_event WHERE category_event_id = ?)',
      [category_event_id]
    );
    */

    await connection.commit();

    const headers = new Headers();
    setCORSHeaders(headers);

    return new Response(JSON.stringify({
      success: true,
      message: 'Workflow deleted successfully',
      category_event_id: category_event_id
    }), {
      status: 200,
      headers
    });

  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError);
      }
    }
    
    console.error('DELETE /api/category error:', error);
    
    const headers = new Headers();
    setCORSHeaders(headers);

    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to delete workflow',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }), { 
      status: 500,
      headers 
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}