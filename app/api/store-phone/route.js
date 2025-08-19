import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { message: 'ID parameter is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Querying store by ID:', id);

    // Select only the desired fields (excluding access_token etc.)
    const rows = await query(
      `SELECT id, shop, countrycode, phonenumber, waba_id, phone_number_id, company_id, installed_at FROM stores WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { message: 'Store not found' },
        { status: 404 }
      );
    }

    console.log('✅ Store found:', rows[0]);

    return NextResponse.json(rows[0]);

  } catch (error) {
    console.error('❌ Error fetching store by ID:', error);
    return NextResponse.json(
      { message: 'Error fetching store', error: error.message },
      { status: 500 }
    );
  }
}
