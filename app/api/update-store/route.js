// app/api/update-store/route.js

import mysql from 'mysql2/promise';

export async function POST(req) {
  try {
    const body = await req.json();
    const { access_token, countrycode, phonenumber, phone_number_id, waba_id } = body;

    // Connect to DB
    const connection = await mysql.createConnection({
      host: '157.173.220.171',
      user: 'apps_db5',
      password: 'q4w3noVm8Pqe',
      database: 'apps_db5',
    });

    // Update the record
    const [result] = await connection.execute(
      `UPDATE stores SET countrycode = ?, phonenumber = ?, phone_number_id = ?, waba_id = ? WHERE access_token = ?`,
      [countrycode, phonenumber, phone_number_id, waba_id, access_token]
    );

    await connection.end();

    if (result.affectedRows === 0) {
      return new Response(JSON.stringify({
        message: 'No matching store found with the given access token',
      }), { status: 404 });
    }

    return new Response(JSON.stringify({
      message: 'Store updated successfully',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Update error:', error);
    return new Response(JSON.stringify({
      message: 'Error updating store',
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
