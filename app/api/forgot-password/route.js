// File: app/api/forgot-password/route.js

import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import db from '@/lib/db'; // Adjust the path to your database configuration

export async function POST(request) {
  try {
    // Parse request body
    const { email, oldPassword, newPassword } = await request.json();

    // Validate input
    if (!email || !oldPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Email, old password, and new password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Check if old and new passwords are the same
    if (oldPassword === newPassword) {
      return NextResponse.json(
        { error: 'New password must be different from old password' },
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
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = rows[0];

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isOldPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password in database
    const updateQuery = `
      UPDATE admin
      SET password = ?
      WHERE email = ?
    `;

    await db.query(updateQuery, [hashedNewPassword, email]);

    // Password updated successfully
    return NextResponse.json(
      { message: 'Password updated successfully', email: user.email },
      { status: 200 }
    );

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}