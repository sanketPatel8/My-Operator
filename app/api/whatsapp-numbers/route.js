import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import crypto from "crypto";

// DB connection config
const dbConfig = {
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
};

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

export async function GET(request) {
  let company_id, whatsapp_api_key;

  try {
    // Get storeToken from query parameters
    const { searchParams } = new URL(request.url);
    const storeToken = searchParams.get('storeToken');
    const limit = searchParams.get('limit') || '10';
    const offset = searchParams.get('offset') || '0';
    const expand = searchParams.get('expand') || 'waba_account';

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

    // Step 1: Connect to DB
    const connection = await mysql.createConnection(dbConfig);

    // Step 2: Query for the decrypted store ID
    const [rows] = await connection.execute(
      'SELECT company_id, whatsapp_api_key FROM stores WHERE id = ?',
      [storeId]
    );

    await connection.end();

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

    const apiUrl = `${baseUrl}/chat/phonenumbers?limit=${limit}&offset=${offset}&expand=${expand}`;

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