import mysql from 'mysql2/promise';

export async function POST(req) {
  try {
    const body = await req.json();
    const { company_id, whatsapp_api_key } = body;

    if (!company_id || !whatsapp_api_key) {
      return new Response(JSON.stringify({ message: 'Missing company_id or whatsapp_api_key' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    });

    const shop = "sanket-store01.myshopify.com";

    // Check if store already exists with this company_id
    const [existingRows] = await connection.execute(
      'SELECT id FROM stores WHERE shop = ?',
      [shop]
    );

    if (existingRows.length > 0) {
      // Update existing store
      await connection.execute(
        'UPDATE stores SET whatsapp_api_key = ?, company_id = ?, updated_at = NOW() WHERE shop = ?',
        [whatsapp_api_key, company_id, shop]
      );

      await connection.end();

      return new Response(
        JSON.stringify({ message: 'Store updated successfully' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } else {
      // Insert new store
      await connection.execute(
        `INSERT INTO stores (company_id, whatsapp_api_key, installed_at, updated_at)
         VALUES (?, ?, NOW(), NOW())`,
        [company_id, whatsapp_api_key]
      );

      await connection.end();

      return new Response(
        JSON.stringify({ message: 'Store inserted successfully' }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Store insert/update error:', error);

    return new Response(
      JSON.stringify({ message: 'Internal server error', error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
