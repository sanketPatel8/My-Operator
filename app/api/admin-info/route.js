// File: app/api/admin-info/route.js

import { NextResponse } from 'next/server';
import db from '@/lib/db'; // Adjust the path to your database configuration

export async function GET(request) {
  try {
    // Query to select specific columns from stores table
    const query = `
      SELECT 
        shop,
        countrycode,
        phonenumber,
        brand_name,
        public_shop_url,
        company_id
      FROM stores
    `;

    // Execute the query
    const [rows] = await db.query(query);

    // Return the data as JSON
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching stores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stores' },
      { status: 500 }
    );
  }
}