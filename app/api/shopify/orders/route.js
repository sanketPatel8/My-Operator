import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db";

// ✅ Handle POST (save new order)
export async function POST(req) {
  try {
    const topic = req.headers.get("x-shopify-topic");
    const shop = req.headers.get("x-shop");
    const data = await req.json();

    console.log("📦 Order received from Remix:", data.id);

    const db = await connectDB();

    await db.query(
      `INSERT INTO orders (order_id, shop, topic, data, created_at)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE data = VALUES(data)`,
      [data.id, shop, topic, JSON.stringify(data)]
    );

    return NextResponse.json({ status: "success", orderId: data.id });
  } catch (err) {
    console.error("❌ Error saving order:", err);
    return NextResponse.json(
      { status: "error", message: err.message },
      { status: 500 }
    );
  }
}

// ✅ Handle GET (fetch orders for frontend)
export async function GET() {
  try {
    const db = await connectDB();

    const [rows] = await db.query(
      `SELECT * FROM orders ORDER BY created_at DESC LIMIT 20`
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error("❌ Error fetching orders:", err);
    return NextResponse.json(
      { status: "error", message: err.message },
      { status: 500 }
    );
  }
}
