import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise'; // Ensure you have mysql2 installed

// DB connection config (you can use environment variables instead for security)
const dbConfig = {
  host: process.env.DATABASE_HOST ,
  user: process.env.DATABASE_USER ,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME ,
};

const STOREID = 11;

export async function GET(request) {
  let company_id, whatsapp_api_key;

  try {
    // Step 1: Connect to DB
    const connection = await mysql.createConnection(dbConfig);

    // Step 2: Query for storeid = 11
    const [rows] = await connection.execute(
      'SELECT company_id, whatsapp_api_key FROM stores WHERE id = ?',
      [STOREID]
    );

    if (!rows.length) {
      return NextResponse.json(
        { message: 'Store not found for given ID' },
        { status: 404 }
      );
    }

    company_id = rows[0].company_id;
    whatsapp_api_key = rows[0].whatsapp_api_key;

    // Step 3: Proceed with API request
    const baseUrl = process.env.NEXT_PUBLIC_BASEURL;
    if (!baseUrl) {
      console.error('Environment variable NEXT_PUBLIC_BASEURL is not defined');
      return NextResponse.json(
        { message: 'Server configuration error', error: 'Base URL is not set in environment' },
        { status: 500 }
      );
    }

    const apiUrl = `${baseUrl}/chat/phonenumbers?limit=10&offset=0&expand=waba_account`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${whatsapp_api_key}`,
        'X-MYOP-COMPANY-ID': company_id,
        'User-Agent': 'MyOperator-API-Client/1.0',
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => `HTTP Error ${response.status}`);
      console.error('API Error Response:', errorText);
      return NextResponse.json(
        {
          message: `API request failed: ${response.status} ${response.statusText}`,
          error: errorText,
          status: response.status,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching WhatsApp numbers:', error);

    if (error.name === 'AbortError') {
      return NextResponse.json(
        { message: 'Request timeout', error: 'The API request took too long to respond' },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { message: 'Failed to fetch WhatsApp numbers', error: error.message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
