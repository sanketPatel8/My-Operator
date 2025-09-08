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

    if (!storeRows || storeRows.length === 0) {
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
        // No redirection URL found either
        return NextResponse.json({
          message: 'Company not found and no redirection URL available'
        }, { status: 404 });
      }
    }

    // Now we're sure storeRows[0] exists
    const rows = await query(
      `SELECT id, shop, brand_name, public_shop_url, countrycode, phonenumber, waba_id, phone_number_id, company_id, installed_at
        FROM stores
        WHERE shop = ?
        LIMIT 1`,
      [storeRows[0].shop]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        message: 'Store details not found'
      }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
        
  } catch (error) {
    console.error('Error fetching company store:', error);
    return NextResponse.json(
      { message: 'Error fetching company store', error: error.message },
      { status: 500 }
    );
  }
}