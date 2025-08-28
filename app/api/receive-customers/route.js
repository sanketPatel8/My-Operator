// Example: app/api/receive-customers/route.js (App Router)
import { NextResponse } from "next/server";

let storedCustomers = []; // in-memory storage (reset on server restart)

export async function POST(req) {
  try {
    const data = await req.json();
    storedCustomers = data.customers || [];
    return NextResponse.json({
      status: "success",
      received: storedCustomers.length,
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: err.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ customers: storedCustomers });
}
