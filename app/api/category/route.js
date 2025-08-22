import mysql from 'mysql2/promise';

// Utility: Normalize phone number (e.g., remove +91 and spaces)
const normalizePhone = (phone) => phone?.replace(/\D/g, '').slice(-10);

// CORS middleware
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

    // Get current store phone number
    const [storeRows] = await connection.execute(
      `SELECT phonenumber FROM stores WHERE id = ? LIMIT 1`,
      [STORE_ID]
    );

    if (storeRows.length === 0) throw new Error('Store not found');

    const currentPhoneNumber = normalizePhone(storeRows[0].phonenumber);

    // Get previous phone number from category_event table
    const [lastPhoneRows] = await connection.execute(
      `SELECT DISTINCT phonenumber FROM category_event WHERE phonenumber IS NOT NULL ORDER BY updated_at DESC LIMIT 1`
    );

    const previousPhoneNumber = lastPhoneRows.length > 0 ? normalizePhone(lastPhoneRows[0].phonenumber) : null;
    const phoneChanged = previousPhoneNumber && previousPhoneNumber !== currentPhoneNumber;

    
    

    const phoneVariants = Array.from(
  new Set([previousPhoneNumber, currentPhoneNumber].filter(Boolean))
);


    console.log("phone number of edit :::::", previousPhoneNumber, currentPhoneNumber);

    // UPSERT category and map events to phone numbers
    const upsertCategory = async (data, phoneNumbers) => {
      const [existing] = await connection.execute(
        'SELECT category_id FROM category WHERE category_name = ?',
        [data.category_name]
      );

      let categoryId;

      if (existing.length > 0) {
        categoryId = existing[0].category_id;
        await connection.execute(
          'UPDATE category SET category_desc = ?, updated_at = NOW() WHERE category_id = ?',
          [data.category_desc, categoryId]
        );
      } else {
        const [insertResult] = await connection.execute(
          'INSERT INTO category (category_name, category_desc, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
          [data.category_name, data.category_desc]
        );
        categoryId = insertResult.insertId;
      }

      let inserted = 0;
      let skipped = 0;

      for (const phone of phoneNumbers) {
  const [existingEvents] = await connection.execute(
    'SELECT title FROM category_event WHERE category_id = ? AND phonenumber = ?',
    [categoryId, phone]
  );

  const existingTitles = new Set(
    existingEvents.map(e => e.title?.trim().toLowerCase())
  );

  for (const event of data.events) {
    const title = event.title?.trim();
    if (!existingTitles.has(title.toLowerCase())) {
      const { subtitle = null, delay = null } = event;

      await connection.execute(
        `INSERT INTO category_event 
          (category_id, title, subtitle, delay, phonenumber, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [categoryId, title, subtitle, delay, phone]
      );
      inserted++;
    } else {
      skipped++;
    }
  }
}

      

      return {
        category: data.category_name,
        categoryId,
        inserted,
        skipped,
        phoneNumbersUsed: phoneNumbers,
        phoneChanged
      };
    };

    // Run upserts
    const results = [];
    results.push(await upsertCategory(abandonedCartData, phoneVariants));
    results.push(await upsertCategory(orderLifecycleData, phoneVariants));
    results.push(await upsertCategory(CODData, phoneVariants));
    results.push(await upsertCategory(WelcomeData, phoneVariants));

    await connection.commit();

    const headers = new Headers();
    setCORSHeaders(headers);

    return new Response(JSON.stringify({
      success: true,
      message: 'Categories and events updated successfully',
      results,
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



// ========== GET ==========

export async function GET() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    });

    const [rows] = await conn.execute(`
      SELECT c.category_id, c.category_name, c.category_desc, c.created_at AS category_created_at,
             ce.category_event_id, ce.title, ce.subtitle, ce.delay, ce.created_at AS event_created_at,
             ce.phonenumber
      FROM category c
      LEFT JOIN category_event ce ON c.category_id = ce.category_id
      ORDER BY c.category_id, ce.category_event_id
    `);

    const categories = {};

    rows.forEach(r => {
      if (!categories[r.category_id]) {
        categories[r.category_id] = {
          categoryId: r.category_id,
          categoryName: r.category_name,
          categoryDesc: r.category_desc,
          createdAt: r.category_created_at,
          events: []
        };
      }
      if (r.category_event_id) {
        categories[r.category_id].events.push({
          eventId: r.category_event_id,
          title: r.title,
          subtitle: r.subtitle,
          delay: r.delay,
          createdAt: r.event_created_at,
          phoneNumber: r.phonenumber
        });
      }
    });

    const headers = new Headers();
    setCORSHeaders(headers);

    return new Response(JSON.stringify({ success: true, categories: Object.values(categories) }), { status: 200, headers });

  } catch (e) {
    console.error('GET /api/category error:', e);
    return new Response(JSON.stringify({ success: false, message: 'DB error', error: e.message }), { status: 500 });
  } finally {
    if (conn) await conn?.end();
  }
}