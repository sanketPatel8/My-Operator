import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const SECRET_KEY = Buffer.from(process.env.SECRET_KEY, "hex"); // 32 bytes

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { storeName, companyId } = body;

    if (!storeName || !companyId) {
      return NextResponse.json({ message: 'Store name and company ID are required' }, { status: 400 });
    }

    // First, check if the company_id exists in the stores table
    const companyRows = await query(
      `SELECT id FROM stores WHERE company_id = ? LIMIT 1`,
      [companyId]
    );

    if (!companyRows || companyRows.length === 0) {
      // Company ID not found, get redirection URL
      const redirectRows = await query(
        `SELECT link FROM redirection_url LIMIT 1`
      );
      
      if (redirectRows && redirectRows.length > 0) {
        return NextResponse.json({ 
          message: 'Company not found',
          redirectUrl: redirectRows[0].link 
        }, { status: 404 });
      } else {
        return NextResponse.json({ 
          message: 'Company not found and no redirection URL available' 
        }, { status: 404 });
      }
    }

    // Company ID exists, now check for the specific store with matching company_id and store name
    const storeRows = await query(
      `SELECT id, shop, brand_name, public_shop_url, countrycode, phonenumber, waba_id, phone_number_id, company_id, installed_at 
       FROM stores 
       WHERE company_id = ? AND shop = ?
       LIMIT 1`,
      [companyId, storeName]
    );

    if (!storeRows || storeRows.length === 0) {
      // Store name doesn't match but company exists
      return NextResponse.json({ 
        message: 'Store name incorrect' 
      }, { status: 400 });
    }

    const store = storeRows[0];

    // Encrypt the store ID to create storeToken
    const storeToken = encrypt(store.id.toString());

    // Prepare response data
    const responseData = {
      message: 'Store validated successfully',
      storeToken: storeToken,
      storeId: store.id,
      shop: store.shop,
      brandName: store.brand_name,
      publicShopUrl: store.public_shop_url,
      countryCode: store.countrycode,
      phonenumber: store.phonenumber,
      wabaId: store.waba_id,
      phoneNumberId: store.phone_number_id,
      companyId: store.company_id,
      installedAt: store.installed_at
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error validating store:', error);
    return NextResponse.json(
      { message: 'Error validating store', error: error.message },
      { status: 500 }
    );
  }
}