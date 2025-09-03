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

export async function POST(req) {
  let connection;
  
  try {
    const body = await req.json();
    const { company_id, whatsapp_api_key, storeToken } = body;

    // Validate required fields
    if (!company_id || !whatsapp_api_key) {
      return NextResponse.json(
        { message: 'Missing company_id or whatsapp_api_key' },
        { status: 400 }
      );
    }

    if (!storeToken) {
      return NextResponse.json(
        { message: 'Missing store token' },
        { status: 400 }
      );
    }

    // Decrypt and validate store token
    let storeId;
    try {
      storeId = decrypt(storeToken);
    } catch (error) {
      return NextResponse.json(
        { message: 'Invalid store token' },
        { status: 401 }
      );
    }

    // Validate storeId after decryption
    if (!storeId) {
      return NextResponse.json(
        { message: 'Invalid store ID' },
        { status: 401 }
      );
    }

    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    });

    console.log("store id:::::", storeId);
    

    // Update existing store
    const [result] = await connection.execute(
      'UPDATE stores SET whatsapp_api_key = ?, company_id = ?, updated_at = NOW() WHERE id = ?',
      [whatsapp_api_key, company_id, storeId]
    );

    // Check if any rows were affected
    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: 'Store not found or no changes made' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Store updated successfully',
        storeId: storeId,
        affectedRows: result.affectedRows
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Store update error:', error);

    // Handle specific database errors
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return NextResponse.json(
        { message: 'Database table not found' },
        { status: 500 }
      );
    }

    if (error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { message: 'Database connection failed' },
        { status: 503 }
      );
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { message: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Generic error response
    return NextResponse.json(
      { 
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: error.message })
      },
      { status: 500 }
    );

  } finally {
    // Always close the database connection
    if (connection) {
      try {
        await connection.end();
      } catch (closeError) {
        console.error('Error closing database connection:', closeError);
      }
    }
  }
}