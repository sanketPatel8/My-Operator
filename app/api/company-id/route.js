import mysql from 'mysql2/promise';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
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
  try {
    const body = await req.json();
    const { company_id, whatsapp_api_key, storeToken } = body;

    if (!company_id || !whatsapp_api_key) {
      return new Response(JSON.stringify({ message: 'Missing company_id or whatsapp_api_key' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let storeId;
        try {
          storeId = decrypt(storeToken);
        } catch (error) {
          return NextResponse.json({ message: 'Invalid store token' }, { status: 401 });
        }

    const connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    });

    const shop = "sanket-store01.myshopify.com";

  

  
      // Update existing store
      await connection.execute(
        'UPDATE stores SET whatsapp_api_key = ?, company_id = ?, updated_at = NOW() WHERE id = ?',
        [whatsapp_api_key, company_id, storeId]
      );

      await connection.end();

      return new Response(
        JSON.stringify({ message: 'Store updated successfully' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
   
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
