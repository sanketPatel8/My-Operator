// File: app/api/login/route.js

import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import db from '@/lib/db'; // Adjust the path to your database configuration

export async function POST(request) {
  try {
    // Parse request body
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Query to get user by email from admin table
    const query = `
      SELECT 
        email,
        password
      FROM admin
      WHERE email = ?
      LIMIT 1
    `;

    // Execute the query
    const [rows] = await db.query(query, [email]);

    // Check if user exists
    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const user = rows[0];

    const haspass = await bcrypt.hash(password, 10);
    

    // Compare password with hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Login successful
    return NextResponse.json(
      { message: 'Login success', email: user.email },
      { status: 200 }
    );

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}