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

const normalizePhone = (phone) => phone?.replace(/\D/g, '').slice(-10);

// CORS middleware
function setCORSHeaders(headers) {
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Max-Age', '86400');
}

export async function OPTIONS() {
  const headers = new Headers();
  setCORSHeaders(headers);
  return new Response(null, { status: 200, headers });
}

// Static category templates
const abandonedCartData = {
  category_name: 'Abandoned Cart Recovery',
  category_desc: 'Recover potentially lost sales by sending automated reminders.',
  events: [
    { title: 'Reminder 1', subtitle: 'Friendly reminder about items left in cart', delay: '1 hours' },
    { title: 'Reminder 2', subtitle: 'Friendly reminder about items left in cart', delay: '4 hours' },
    { title: 'Reminder 3', subtitle: 'Friendly reminder about items left in cart', delay: '4 hours' }
  ]
};

const orderLifecycleData = {
  category_name: 'Order life cycle Notification',
  category_desc: 'Automate essential communications and enable direct customer interaction for key order events.',
  events: [
    { title: 'Order Placed', subtitle: 'Send when an order is created.' },
    { title: 'Order Cancelled', subtitle: 'Notify customers when the order is cancelled.' },
    { title: 'Payment Received', subtitle: 'Notify customers when their payment is processed.' },
    { title: 'Order Shipped', subtitle: 'Notify customers when the order is shipped.' },
    { title: 'Order Delivered', subtitle: 'Notify customers when the order is delivered.' },
    { title: 'Order Out for Delivery', subtitle: 'Notify customers when the order is out for delivery.' },
    { title: 'Refund Create', subtitle: 'Notify customers when the refund is created.' },
    { title: 'Reorder Reminder', subtitle: 'Notify customers to reorder after set of period.' },
    { title: 'Order Feedback', subtitle: 'Take feedback from the customers after a set of period.'}
  ]
};

const CODData = {
  category_name: 'Cash-on-Delivery (COD) Management',
  category_desc: 'Automate COD order confirmations, cancellations, and conversion to prepaid to reduce fraud and non-deliveries.',
  events: [
    { title: 'COD Order Confirmation or Cancel', subtitle: 'Automated message to confirm/cancel COD orders.' },
    { title: 'COD Order Cancellation Event Triggered', subtitle: 'Sent when a COD order is cancelled by the customer.' },
    { title: 'Convert COD to Paid', subtitle: 'Encourage customers to make a payment on their COD order.' }
  ]
};

const WelcomeData = {
  category_name: 'Welcome Notifications',
  category_desc: 'Engage new customers as soon as they are created.',
  events: [
    { title: 'Welcome Customer', subtitle: 'Send an automated welcome message when a new account is created.' }
  ]
};

// Enhanced PUT endpoint for storing comma-separated template_variable_ids and updating template variables
export async function PUT(request) {
  let connection;

  try {
    const body = await request.json();
    const { 
      storeToken,
      category_id, 
      category_event_id, 
      delay, 
      template, 
      variableSettings,
      template_id,           // Single template ID
      template_data_id,      // Single template data ID
      template_variable_id   // Comma-separated string of variable IDs
    } = body;

    if (!storeToken) {
      return NextResponse.json({ message: 'Store token is required' }, { status: 400 });
    }
    
    // Decrypt the token to get the store ID
    let STORE_ID;
    try {
      STORE_ID = decrypt(storeToken);
    } catch (error) {
      return NextResponse.json({ message: 'Invalid store token' }, { status: 401 });
    }

    // Validate required fields
    if (!category_id || !category_event_id) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Category ID and Event ID are required'
      }), { status: 400 });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Get store info and validate
    const [storeRows] = await connection.execute(
      `SELECT phonenumber FROM stores WHERE id = ? LIMIT 1`,
      [STORE_ID]
    );

    if (storeRows.length === 0) {
      throw new Error('Store not found');
    }

    const currentPhoneNumber = normalizePhone(storeRows[0].phonenumber);

    // Verify the event exists using store_id and phonenumber
    const [existingEvent] = await connection.execute(`
      SELECT ce.category_event_id, ce.category_id, c.category_name
      FROM category_event ce
      JOIN category c ON ce.category_id = c.category_id
      WHERE ce.category_event_id = ? AND ce.category_id = ? AND ce.store_id = ? AND ce.phonenumber = ?
    `, [category_event_id, category_id, STORE_ID, currentPhoneNumber]);

    if (existingEvent.length === 0) {
      throw new Error('Workflow event not found for this store');
    }

    // Log the template_variable_id for debugging
    console.log('Storing template_variable_ids:', template_variable_id);
    console.log('Variable Settings:', variableSettings);

    // Update category_event with comma-separated template_variable_id
    const updateQuery = `
      UPDATE category_event 
      SET 
        delay = ?,
        template_id = ?,
        template_data_id = ?,
        template_variable_id = ?
      WHERE category_event_id = ? AND category_id = ? AND store_id = ? AND phonenumber = ?
    `;

    const [updateResult] = await connection.execute(updateQuery, [
      delay || null,
      template_id || null,
      template_data_id || null,
      template_variable_id || null, // This will be a comma-separated string like "1109,1110,1111"
      category_event_id,
      category_id,
      STORE_ID,
      currentPhoneNumber
    ]);

    if (updateResult.affectedRows === 0) {
      throw new Error('No workflow event found to update');
    }

    // Update individual template variables with mapping_field and fallback_value
    if (template_variable_id && variableSettings) {
      console.log('=== DEBUGGING TEMPLATE VARIABLES ===');
      console.log('template_variable_id:', template_variable_id);
      console.log('variableSettings type:', typeof variableSettings);
      console.log('variableSettings keys:', Object.keys(variableSettings));
      console.log('variableSettings full object:', JSON.stringify(variableSettings, null, 2));
      
      const variableIds = template_variable_id.split(',').map(id => parseInt(id.trim()));
      console.log('Parsed variableIds:', variableIds);
      
      // First, get the actual template variables from database to understand the structure
      const [currentVariables] = await connection.execute(`
        SELECT template_variable_id, variable_name, component_type, type
        FROM template_variable 
        WHERE template_variable_id IN (${variableIds.map(() => '?').join(',')})
        ORDER BY template_variable_id
      `, variableIds);
      
      console.log('Current template variables from DB:', currentVariables);
      
      for (const variableId of variableIds) {
        console.log(`\n--- Processing Variable ID: ${variableId} ---`);
        
        // Get the variable info from database
        const currentVar = currentVariables.find(v => v.template_variable_id === variableId);
        console.log('Current variable from DB:', currentVar);
        
        // Try multiple ways to find the variable setting
        let variableSetting = null;
        let settingKey = null;
        let settingValue = null;
        
        // Method 1: Direct ID match
        if (variableSettings[variableId.toString()]) {
          settingKey = variableId.toString();
          settingValue = variableSettings[variableId.toString()];
          variableSetting = [settingKey, settingValue];
          console.log('Found by direct ID match');
        }
        // Method 2: Variable name match
        else if (currentVar && variableSettings[currentVar.variable_name]) {
          settingKey = currentVar.variable_name;
          settingValue = variableSettings[currentVar.variable_name];
          variableSetting = [settingKey, settingValue];
          console.log('Found by variable name match');
        }
        // Method 3: Search through all entries
        else {
          const foundEntry = Object.entries(variableSettings).find(([key, value]) => {
            return key === variableId.toString() || 
                   (typeof value === 'object' && value.variableId === variableId) ||
                   (currentVar && key === currentVar.variable_name);
          });
          if (foundEntry) {
            variableSetting = foundEntry;
            settingKey = foundEntry[0];
            settingValue = foundEntry[1];
            console.log('Found by comprehensive search');
          }
        }

        console.log('Variable setting found:', variableSetting);
        console.log('Setting key:', settingKey);
        console.log('Setting value:', settingValue);

        if (variableSetting) {
          let mappingField = null;
          let fallbackValue = null;

          // Extract mapping field and fallback value from variableSettings
          if (typeof settingValue === 'object' && settingValue !== null) {
            mappingField = settingValue.dropdown || settingValue.mappingField || settingValue.mapping_field || null;
            fallbackValue = settingValue.fallback || settingValue.fallbackValue || settingValue.fallback_value || null;
            console.log('Extracted from object - mappingField:', mappingField, 'fallbackValue:', fallbackValue);
          } else if (typeof settingValue === 'string') {
            // If it's a string, treat it as fallback value
            fallbackValue = settingValue;
            console.log('Extracted from string - fallbackValue:', fallbackValue);
          }

          console.log(`Final values - mappingField: "${mappingField}", fallbackValue: "${fallbackValue}"`);

          // Update the template_variable table
          const updateVariableQuery = `
            UPDATE template_variable 
            SET 
              mapping_field = ?,
              fallback_value = ?,
              updated_at = NOW()
            WHERE template_variable_id = ?
          `;

          const [updateVarResult] = await connection.execute(updateVariableQuery, [
            mappingField,
            fallbackValue,
            variableId
          ]);

          console.log(`Update result for variable ${variableId}:`, updateVarResult);
          console.log(`Updated template_variable_id ${variableId} with mapping_field: "${mappingField}", fallback_value: "${fallbackValue}"`);
        } else {
          console.log(`No variable setting found for variable ID: ${variableId}`);
          console.log('Available setting keys:', Object.keys(variableSettings));
        }
      }
      console.log('=== END DEBUGGING ===\n');
    } else {
      console.log('Skipping template variable updates:');
      console.log('template_variable_id exists:', !!template_variable_id);
      console.log('variableSettings exists:', !!variableSettings);
    }

    // Fetch the updated event to return
    const [updatedEvent] = await connection.execute(`
      SELECT ce.*, c.category_name
      FROM category_event ce
      JOIN category c ON ce.category_id = c.category_id
      WHERE ce.category_event_id = ? AND ce.store_id = ? AND ce.phonenumber = ?
    `, [category_event_id, STORE_ID, currentPhoneNumber]);

    // Parse the comma-separated template_variable_id back to array for response
    const eventData = updatedEvent[0];
    if (eventData.template_variable_id) {
      eventData.template_variable_ids_array = eventData.template_variable_id.split(',').map(id => parseInt(id.trim()));
    }

    // Fetch updated template variables for response
    if (eventData.template_variable_id) {
      const [updatedVariables] = await connection.execute(`
        SELECT template_variable_id, type, value, variable_name, component_type, mapping_field, fallback_value
        FROM template_variable 
        WHERE template_variable_id IN (${eventData.template_variable_id})
        ORDER BY template_variable_id
      `);
      eventData.template_variables_details = updatedVariables;
    }

    await connection.commit();

    const headers = new Headers();
    setCORSHeaders(headers);

    return new Response(JSON.stringify({
      success: true,
      message: 'Workflow event and template variables updated successfully',
      data: eventData
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
    console.error('PUT /api/category error:', error);
    
    const headers = new Headers();
    setCORSHeaders(headers);

    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to update workflow event',
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

// POST endpoint to initialize/sync workflow categories and events
export async function POST(request) {
  const body = await request.json();
  const { storeToken } = body;
  let connection;

  try {
    if(!storeToken) {
      return NextResponse.json({ message: 'Store token is required' }, { status: 400 });
    }
    
    // Decrypt the token to get the store ID
    let STORE_ID;
    try {
      STORE_ID = decrypt(storeToken);
    } catch (error) {
      return NextResponse.json({ message: 'Invalid store token' }, { status: 401 });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Get store phone number
    const [storeRows] = await connection.execute(
      `SELECT phonenumber FROM stores WHERE id = ? LIMIT 1`,
      [STORE_ID]
    );

    if (storeRows.length === 0) {
      throw new Error('Store not found');
    }

    // Normalize the phone number
    const currentPhoneNumber = normalizePhone(storeRows[0].phonenumber?.trim());

    // Check if any events already exist for this store_id and phone number combination
    const [existingEvents] = await connection.execute(
      `SELECT COUNT(*) as count FROM category_event WHERE store_id = ? AND phonenumber = ?`,
      [STORE_ID, currentPhoneNumber]
    );

    if (existingEvents[0].count > 0) {
      await connection.rollback();

      const headers = new Headers();
      setCORSHeaders(headers);

      return new Response(JSON.stringify({
        success: true,
        message: 'Category events already exist for this store and phone number combination. Skipping initialization.'
      }), {
        status: 200,
        headers
      });
    }

    const processedCategories = new Set();

    const upsertCategory = async (data) => {
      const normalizedCategoryName = data.category_name.trim();
      const lowerCategoryName = normalizedCategoryName.toLowerCase();

      if (processedCategories.has(lowerCategoryName)) {
        return { category: data.category_name, category_id: null, inserted: 0, skipped: true };
      }
      processedCategories.add(lowerCategoryName);

      // Check if category exists
      const [existingCategory] = await connection.execute(
        'SELECT category_id FROM category WHERE LOWER(TRIM(category_name)) = ? LIMIT 1',
        [lowerCategoryName]
      );

      let category_id;
      if (existingCategory.length > 0) {
        category_id = existingCategory[0].category_id;

        await connection.execute(
          'UPDATE category SET category_desc = ?, updated_at = NOW() WHERE category_id = ?',
          [data.category_desc, category_id]
        );
      } else {
        const [insertResult] = await connection.execute(
          'INSERT INTO category (category_name, category_desc, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
          [normalizedCategoryName, data.category_desc]
        );
        category_id = insertResult.insertId;
      }

      // Insert new events with store_id and phonenumber combination
      let inserted = 0;
      for (const event of data.events) {
        const title = event.title?.trim();
        if (!title) continue;

        const subtitle = event.subtitle || null;
        const delay = event.delay || null;

        try {
          // Check if this specific combination exists
          const [existingEvent] = await connection.execute(
            `SELECT category_event_id FROM category_event 
             WHERE category_id = ? AND LOWER(TRIM(title)) = ? AND store_id = ? AND phonenumber = ?
             LIMIT 1`,
            [category_id, title.toLowerCase(), STORE_ID, currentPhoneNumber]
          );

          if (existingEvent.length === 0) {
            await connection.execute(
              `INSERT INTO category_event 
                (category_id, title, subtitle, delay, store_id, phonenumber, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
              [category_id, title, subtitle, delay, STORE_ID, currentPhoneNumber]
            );
            inserted++;
          }

        } catch (e) {
          console.error(`Failed to insert event '${title}'`, e.message);
        }
      }

      return {
        category: data.category_name,
        category_id,
        inserted,
        updated: 0,
        skipped: false
      };
    };

    // Process all categories
    const results = [];
    results.push(await upsertCategory(abandonedCartData));
    results.push(await upsertCategory(orderLifecycleData));
    results.push(await upsertCategory(CODData));
    results.push(await upsertCategory(WelcomeData));

    await connection.commit();

    const headers = new Headers();
    setCORSHeaders(headers);

    return new Response(JSON.stringify({
      success: true,
      message: 'Categories and events processed successfully',
      results
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
      message: 'Database error',
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

export async function PATCH(request) {
  let connection;

  try {
    const body = await request.json();
    const { storeToken, category_event_id, status } = body;

    if (!storeToken) {
      return NextResponse.json({ message: 'Store token is required' }, { status: 400 });
    }
       
    // Decrypt the token to get the store ID
    let STORE_ID;
    try {
      STORE_ID = decrypt(storeToken);
    } catch (error) {
      return NextResponse.json({ message: 'Invalid store token' }, { status: 401 });
    }

    if (typeof category_event_id !== 'number' || typeof status !== 'number') {
      throw new Error('Invalid payload');
    }

    connection = await pool.getConnection();

    // Get store phone number
    const [storeRows] = await connection.execute(
      `SELECT phonenumber FROM stores WHERE id = ? LIMIT 1`,
      [STORE_ID]
    );

    if (storeRows.length === 0) {
      throw new Error('Store not found');
    }

    const currentPhoneNumber = normalizePhone(storeRows[0].phonenumber);

    const [result] = await connection.execute(
      `UPDATE category_event 
       SET status = ?, updated_at = NOW() 
       WHERE category_event_id = ? AND store_id = ? AND phonenumber = ?`,
      [status, category_event_id, STORE_ID, currentPhoneNumber]
    );

    const headers = new Headers();
    setCORSHeaders(headers);

    return new Response(JSON.stringify({
      success: true,
      message: `Status updated successfully for category_event_id ${category_event_id}`,
      affectedRows: result.affectedRows
    }), {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('PATCH /api/category error:', error);

    const headers = new Headers();
    setCORSHeaders(headers);

    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to update status',
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

// GET endpoint to fetch categories and events for the store
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const storeToken = searchParams.get('storeToken');
  let connection;
  
  try {
    if (!storeToken) {
      return NextResponse.json({ message: 'Store token is required' }, { status: 400 });
    }
    
    // Decrypt the token to get the store ID
    let STORE_ID;
    try {
      STORE_ID = decrypt(storeToken);
    } catch (error) {
      return NextResponse.json({ message: 'Invalid store token' }, { status: 401 });
    }

    connection = await pool.getConnection();

    // Get current store phone number
    const [storeRows] = await connection.execute(
      `SELECT phonenumber FROM stores WHERE id = ? LIMIT 1`,
      [STORE_ID]
    );

    if (storeRows.length === 0) {
      const headers = new Headers();
      setCORSHeaders(headers);
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Store not found' 
      }), { 
        status: 404,
        headers 
      });
    }

    const currentPhoneNumber = normalizePhone(storeRows[0].phonenumber);

    // Fetch categories and events for this store's store_id and phone number combination
    const [rows] = await connection.execute(`
      SELECT 
        c.category_id, 
        c.category_name, 
        c.category_desc, 
        c.created_at AS category_created_at,
        ce.category_event_id, 
        ce.title, 
        ce.subtitle, 
        ce.delay,
        ce.status,
        ce.created_at AS event_created_at,
        ce.store_id,
        ce.phonenumber
      FROM category c
      LEFT JOIN category_event ce ON c.category_id = ce.category_id 
        AND ce.store_id = ? AND ce.phonenumber = ?
      WHERE c.category_id IN (
        SELECT DISTINCT category_id 
        FROM category_event 
        WHERE store_id = ? AND phonenumber = ?
      )
      ORDER BY c.category_id, ce.category_event_id
    `, [STORE_ID, currentPhoneNumber, STORE_ID, currentPhoneNumber]);

    // Group by categories
    const categoriesMap = {};

    rows.forEach(row => {
      if (!categoriesMap[row.category_id]) {
        categoriesMap[row.category_id] = {
          category_id: row.category_id,
          categoryName: row.category_name,
          categoryDesc: row.category_desc,
          createdAt: row.category_created_at,
          events: []
        };
      }

      if (row.category_event_id) {
        categoriesMap[row.category_id].events.push({
          category_event_id: row.category_event_id,
          title: row.title,
          subtitle: row.subtitle,
          delay: row.delay,
          status: row.status,
          template_name: row.template_name,
          template_variables: row.template_variables ? JSON.parse(row.template_variables) : null,
          createdAt: row.event_created_at,
          storeId: row.store_id,
          phoneNumber: row.phonenumber
        });
      }
    });

    const headers = new Headers();
    setCORSHeaders(headers);

    return new Response(JSON.stringify({ 
      success: true, 
      categories: Object.values(categoriesMap),
      store_id: STORE_ID,
      store_phone: currentPhoneNumber 
    }), {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('GET /api/category error:', error);
    
    const headers = new Headers();
    setCORSHeaders(headers);
    
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Database error', 
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

// DELETE method to clean template data
export async function DELETE(request) {
  let connection;

  try {
    const body = await request.json();
    const { storeToken, category_event_id } = body;

    if (!storeToken) {
      return NextResponse.json({ message: 'Store token is required' }, { status: 400 });
    }
       
    // Decrypt the token to get the store ID
    let STORE_ID;
    try {
      STORE_ID = decrypt(storeToken);
    } catch (error) {
      return NextResponse.json({ message: 'Invalid store token' }, { status: 401 });
    }

    // Validate required fields
    if (!category_event_id) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Category Event ID is required'
      }), { status: 400 });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Get store info and validate
    const [storeRows] = await connection.execute(
      `SELECT phonenumber FROM stores WHERE id = ? LIMIT 1`,
      [STORE_ID]
    );

    if (storeRows.length === 0) {
      throw new Error('Store not found');
    }

    const currentPhoneNumber = normalizePhone(storeRows[0].phonenumber);

    // Get the category_event with current template_variable_id
    const [eventRows] = await connection.execute(`
      SELECT category_event_id, category_id, template_variable_id
      FROM category_event 
      WHERE category_event_id = ? AND store_id = ? AND phonenumber = ?
    `, [category_event_id, STORE_ID, currentPhoneNumber]);

    if (eventRows.length === 0) {
      throw new Error('Workflow event not found for this store');
    }

    const eventData = eventRows[0];
    const templateVariableId = eventData.template_variable_id;

    console.log('=== DELETE TEMPLATE DATA ===');
    console.log('Category Event ID:', category_event_id);
    console.log('Template Variable ID to clean:', templateVariableId);

    // Step 1: Clean up template_variable records if template_variable_id exists
    if (templateVariableId) {
      const variableIds = templateVariableId.split(',').map(id => parseInt(id.trim()));
      console.log('Cleaning template variables:', variableIds);

      // Set mapping_field and fallback_value to NULL for all related template variables
      const placeholders = variableIds.map(() => '?').join(',');
      const cleanVariablesQuery = `
        UPDATE template_variable 
        SET 
          mapping_field = NULL,
          fallback_value = NULL,
          updated_at = NOW()
        WHERE template_variable_id IN (${placeholders})
      `;

      const [cleanResult] = await connection.execute(cleanVariablesQuery, variableIds);
      console.log(`Cleaned ${cleanResult.affectedRows} template variables`);
    }

    // Step 2: Set template fields to NULL in category_event
    const updateEventQuery = `
      UPDATE category_event 
      SET 
        template_id = NULL,
        template_data_id = NULL,
        template_variable_id = NULL,
        updated_at = NOW()
      WHERE category_event_id = ? AND store_id = ? AND phonenumber = ?
    `;

    const [updateResult] = await connection.execute(updateEventQuery, [
      category_event_id,
      currentPhoneNumber
    ]);

    if (updateResult.affectedRows === 0) {
      throw new Error('No workflow event found to update');
    }

    console.log('Successfully cleaned template data from category_event');

    // Fetch the updated event to return
    const [updatedEvent] = await connection.execute(`
      SELECT ce.*, c.category_name
      FROM category_event ce
      JOIN category c ON ce.category_id = c.category_id
      WHERE ce.category_event_id = ? AND ce.phonenumber = ?
    `, [category_event_id, currentPhoneNumber]);

    await connection.commit();

    const headers = new Headers();
    setCORSHeaders(headers);

    return new Response(JSON.stringify({
      success: true,
      message: 'Template data deleted successfully',
      data: updatedEvent[0]
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
      message: 'Failed to delete template data',
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