import pool from "@/lib/db";

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

// Your test store ID
const STORE_ID = 11;

// PUT endpoint to update workflow event
export async function PUT(request) {
  let connection;

  try {
    const body = await request.json();
    const { category_id, category_event_id, delay, template, variableSettings } = body;

    // Validate required fields
    if (!category_id || !category_event_id) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Category ID and Event ID are required'
      }), { status: 400 });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // First, verify the category_event exists and belongs to the correct store
    const [storeRows] = await connection.execute(
      `SELECT phonenumber FROM stores WHERE id = ? LIMIT 1`,
      [STORE_ID]
    );

    if (storeRows.length === 0) {
      throw new Error('Store not found');
    }

    const currentPhoneNumber = normalizePhone(storeRows[0].phonenumber);

    // Verify the event exists for this store's phone number
    const [existingEvent] = await connection.execute(`
      SELECT ce.category_event_id, ce.category_id, c.category_name
      FROM category_event ce
      JOIN category c ON ce.category_id = c.category_id
      WHERE ce.category_event_id = ? AND ce.category_id = ? AND ce.phonenumber = ?
    `, [category_event_id, category_id, currentPhoneNumber]);

    if (existingEvent.length === 0) {
      throw new Error('Workflow event not found for this store');
    }

    // Update the category_event with new delay and template info
    const updateQuery = `
      UPDATE category_event 
      SET 
        delay = ?,
        template_name = ?,
        template_variables = ?,
        updated_at = NOW()
      WHERE category_event_id = ? AND category_id = ? AND phonenumber = ?
    `;

    const [updateResult] = await connection.execute(updateQuery, [
      delay || null,
      template || null,
      JSON.stringify(variableSettings) || null,
      category_event_id,
      category_id,
      currentPhoneNumber
    ]);

    if (updateResult.affectedRows === 0) {
      throw new Error('No workflow event found to update');
    }

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
      message: 'Workflow event updated successfully',
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
  let connection;

  try {
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

    // Check if any events already exist for this phone number
    const [existingEvents] = await connection.execute(
      `SELECT COUNT(*) as count FROM category_event WHERE phonenumber = ?`,
      [currentPhoneNumber]
    );

    if (existingEvents[0].count > 0) {
      await connection.rollback(); // rollback in case the transaction already started

      const headers = new Headers();
      setCORSHeaders(headers);

      return new Response(JSON.stringify({
        success: true,
        message: 'Category events already exist for this store. Skipping initialization.'
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

      // Insert new events
      let inserted = 0;
      for (const event of data.events) {
        const title = event.title?.trim();
        if (!title) continue;

        const subtitle = event.subtitle || null;
        const delay = event.delay || null;

        try {
          await connection.execute(
            `INSERT IGNORE INTO category_event 
              (category_id, title, subtitle, delay, phonenumber, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
            [category_id, title, subtitle, delay, currentPhoneNumber]
          );

          const [checkInserted] = await connection.execute(
            `SELECT category_event_id FROM category_event 
             WHERE category_id = ? AND LOWER(TRIM(title)) = ? LIMIT 1`,
            [category_id, title.toLowerCase()]
          );

          if (checkInserted.length > 0) {
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


// GET endpoint to fetch categories and events for the store
export async function GET() {
  let connection;
  
  try {
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

    // Fetch categories and events for this store's phone number
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
        ce.created_at AS event_created_at,
        ce.phonenumber
      FROM category c
      LEFT JOIN category_event ce ON c.category_id = ce.category_id AND ce.phonenumber = ?
      WHERE c.category_id IN (
        SELECT DISTINCT category_id 
        FROM category_event 
        WHERE phonenumber = ?
      )
      ORDER BY c.category_id, ce.category_event_id
    `, [currentPhoneNumber, currentPhoneNumber]);

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
          template_name: row.template_name,
          template_variables: row.template_variables ? JSON.parse(row.template_variables) : null,
          createdAt: row.event_created_at,
          phoneNumber: row.phonenumber
        });
      }
    });

    const headers = new Headers();
    setCORSHeaders(headers);

    return new Response(JSON.stringify({ 
      success: true, 
      categories: Object.values(categoriesMap),
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