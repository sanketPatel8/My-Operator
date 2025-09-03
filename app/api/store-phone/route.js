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

export async function POST(request) {
  try {
    const body = await request.json();
    const { storeToken } = body;

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

    // Query the database using the decrypted store ID
    const rows = await query(
      `SELECT id, shop, brand_name, public_shop_url, countrycode, phonenumber, waba_id, phone_number_id, company_id, installed_at 
       FROM stores 
       WHERE id = ? 
       LIMIT 1`,
      [storeId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ message: 'Store not found' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);

  } catch (error) {
    console.error('Error fetching store:', error);
    return NextResponse.json(
      { message: 'Error fetching store', error: error.message },
      { status: 500 }
    );
  }
}