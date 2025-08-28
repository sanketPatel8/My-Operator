// // Example: app/api/receive-customers/route.js (App Router)
// import { NextResponse } from "next/server";

// let storedCustomers = []; // in-memory storage (reset on server restart)

// export async function POST(req) {
//   try {
//     const data = await req.json();
//     storedCustomers = data.customers || [];
//     return NextResponse.json({
//       status: "success",
//       received: storedCustomers.length,
//     });
//   } catch (err) {
//     return NextResponse.json(
//       { status: "error", message: err.message },
//       { status: 500 }
//     );
//   }
// }

// export async function GET() {
//   return NextResponse.json({ customers: storedCustomers });
// }

import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { customers } = await req.json();

    console.log("✅ Customers received from Remix:", customers.length);

    // 👉 You don't need DB. Just return them or process them further.
    // For example: send to frontend, log, or forward to another service.

    return NextResponse.json({
      status: "success",
      received: customers.length,
    });
  } catch (err) {
    console.error("❌ Error receiving customers:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
