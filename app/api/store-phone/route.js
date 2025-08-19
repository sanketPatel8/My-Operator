import { NextResponse } from 'next/server';
import { query } from '@/lib/db'; // Make sure this is correctly configured

export async function GET(request) {
  try {
    // ⛔ ignore searchParams during testing
    const id = 11; // ✅ force ID here to test

    const rows = await query(
      `SELECT id, shop, countrycode, phonenumber, waba_id, phone_number_id, company_id, installed_at 
       FROM stores 
       WHERE id = ? 
       LIMIT 1`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ message: 'Store not found' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);

  } catch (error) {
    return NextResponse.json(
      { message: 'Error fetching store', error: error.message },
      { status: 500 }
    );
  }
}


