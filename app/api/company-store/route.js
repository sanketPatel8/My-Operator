import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { companyId } = body;

    if (!companyId) {
      return NextResponse.json({ message: 'Company ID is required' }, { status: 400 });
    }

    // Get the shop URL for the company
    const storeRows = await query(
      `SELECT shop FROM stores WHERE company_id = ? LIMIT 1`,
      [companyId]
    );

    if (storeRows && storeRows.length > 0) {
      return NextResponse.json({
        message: 'Store found',
        shop: storeRows[0].shop
      });
    } else {
      return NextResponse.json({
        message: 'No store found for this company'
      }, { status: 404 });
    }

  } catch (error) {
    console.error('Error fetching company store:', error);
    return NextResponse.json(
      { message: 'Error fetching company store', error: error.message },
      { status: 500 }
    );
  }
}