import mysql from 'mysql2/promise';

// CORS middleware function
function setCORSHeaders(headers) {
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Max-Age', '86400');
}

export async function OPTIONS() {
  const headers = new Headers();
  setCORSHeaders(headers);
  return new Response(null, { status: 200, headers });
}

// Static data
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
    { title: 'COD Order Confirmation or Cancel', subtitle: 'Automated message to confirm/cancel COD orders.'},
    { title: 'COD Order Cancellation Event Triggered', subtitle: 'Sent when a COD order is cancelled by the customer.'},
    { title: 'Convert COD to Paid', subtitle: 'Encourage customers to make a payment on their COD order.'}
  ]
};

const WelcomeData = {
  category_name: 'Welcome Notifications',
  category_desc: 'Engage new customers as soon as they are created.',
  events: [
    { title: 'Welcome Customer', subtitle: 'Send an automated welcome message when a new account is created.'}
  ]
};

// ========== GET ==========

export async function GET(request) {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    });

    const query = `
      SELECT 
        c.category_id,
        c.category_name,
        c.category_desc,
        c.created_at as category_created_at,
        ce.category_event_id,
        ce.title,
        ce.subtitle,
        ce.delay,
        ce.created_at as event_created_at
      FROM category c
      LEFT JOIN category_event ce ON c.category_id = ce.category_id
      ORDER BY c.category_id, ce.category_event_id
    `;

    const [results] = await connection.execute(query);

    const categories = {};
    results.forEach(row => {
      if (!categories[row.category_id]) {
        categories[row.category_id] = {
          categoryId: row.category_id,
          categoryName: row.category_name,
          categoryDesc: row.category_desc,
          createdAt: row.category_created_at,
          events: []
        };
      }

      if (row.category_event_id) {
        categories[row.category_id].events.push({
          eventId: row.category_event_id,
          title: row.title,
          subtitle: row.subtitle,
          delay: row.delay,
          createdAt: row.event_created_at
        });
      }
    });

    const headers = new Headers();
    setCORSHeaders(headers);

    return new Response(JSON.stringify({
      success: true,
      categories: Object.values(categories)
    }), {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('GET /api/category error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Database error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }), {
      status: 500
    });
  } finally {
    if (connection) await connection.end();
  }
}

// ========== POST ==========

export async function POST(request) {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    });

    await connection.beginTransaction();
    const results = [];

    const upsertCategory = async (data) => {
      // Check if category exists
      const [existingRows] = await connection.execute(
        'SELECT category_id FROM category WHERE category_name = ?',
        [data.category_name]
      );

      let categoryId;

      if (existingRows.length > 0) {
        // Update category
        categoryId = existingRows[0].category_id;
        await connection.execute(
          'UPDATE category SET category_desc = ?, updated_at = NOW() WHERE category_id = ?',
          [data.category_desc, categoryId]
        );
      } else {
        // Insert category
        const [insertResult] = await connection.execute(
          'INSERT INTO category (category_name, category_desc, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
          [data.category_name, data.category_desc]
        );
        categoryId = insertResult.insertId;
      }

      // Fetch existing events
      const [existingEvents] = await connection.execute(
        'SELECT category_event_id, title FROM category_event WHERE category_id = ?',
        [categoryId]
      );

      const existingEventMap = {};
      existingEvents.forEach(event => {
        const key = event.title.trim().toLowerCase();
        existingEventMap[key] = event.category_event_id;
      });

      for (const event of data.events) {
        const normalizedTitle = event.title.trim().toLowerCase();
        const subtitle = event.subtitle || null;
        const delay = event.delay || null;

        if (existingEventMap[normalizedTitle]) {
          // Update existing event
          await connection.execute(
            'UPDATE category_event SET subtitle = ?, delay = ?, updated_at = NOW() WHERE category_event_id = ?',
            [subtitle, delay, existingEventMap[normalizedTitle]]
          );
        } else {
          // Insert new event
          await connection.execute(
            'INSERT INTO category_event (category_id, title, subtitle, delay, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
            [categoryId, event.title.trim(), subtitle, delay]
          );
        }
      }

      return {
        category: data.category_name,
        categoryId,
        eventsCount: data.events.length,
        updated: existingRows.length > 0
      };
    };

    // Upsert each category
    results.push(
      await upsertCategory(abandonedCartData),
      await upsertCategory(orderLifecycleData),
      await upsertCategory(CODData),
      await upsertCategory(WelcomeData)
    );

    await connection.commit();

    const headers = new Headers();
    setCORSHeaders(headers);

    return new Response(JSON.stringify({
      success: true,
      message: 'Workflow categories upserted successfully',
      results
    }), {
      status: 200,
      headers
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('POST /api/category error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Database error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }), { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}
