// import { NextResponse } from "next/server";

// import { connectDB } from "@/lib/db";

// // ✅ Handle POST (save new order)
// export async function POST(req) {
//   try {
//     const topic = req.headers.get("x-shopify-topic");
//     const shop = req.headers.get("x-shop");
//     const data = await req.json();

//     console.log("📦 Order received from Remix:", data.id);

//     return NextResponse.json({ status: "success", order: data });
//   } catch (err) {
//     console.error("❌ Error saving order:", err);
//     return NextResponse.json(
//       { status: "error", message: err.message },
//       { status: 500 }
//     );
//   }
// }

// // ✅ Handle GET (fetch orders for frontend)
// export async function GET() {
//   try {
//     const db = await connectDB();

//     const [rows] = await db.query(
//       `SELECT * FROM orders ORDER BY created_at DESC LIMIT 20`
//     );
//     return NextResponse.json(rows);
//   } catch (err) {
//     console.error("❌ Error fetching orders:", err);
//     return NextResponse.json(
//       { status: "error", message: err.message },
//       { status: 500 }
//     );
//   }
// }

import { NextResponse } from "next/server";

// ✅ Handle POST (receive new order)
export async function POST(req) {
  try {
    const topic = req.headers.get("x-shopify-topic");
    const shop = req.headers.get("x-shop");
    const data = await req.json();

    console.log(
      `📦 Order received from Remix [${topic}] from shop ${shop}:`,
      data
    );

    // Just return the payload, no DB
    return NextResponse.json({ status: "success", order: data });
  } catch (err) {
    console.error("❌ Error receiving order:", err);
    return NextResponse.json(
      { status: "error", message: err.message },
      { status: 500 }
    );
  }
}

// ✅ Handle GET (optional test endpoint)
export async function GET() {
  // No DB, just a simple message
  return NextResponse.json({
    status: "success",
    message: "Orders endpoint is live",
  });
}
