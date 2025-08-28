// import { NextResponse } from "next/server";

// import { pushUpdate } from "../stream/route";

// // Inside your POST handler:



// // ✅ In-memory orders store
// let orders = [];

// // ✅ Handle POST (receive new order)
// export async function POST(req) {
//   try {
    
//     const topic = req.headers.get("x-shopify-topic");
//     const shop = req.headers.get("x-shop");
//     const data = await req.json();

//     console.log(`📦 Order received [${topic}] from shop ${shop}:`, data);

//     // Store order in memory
//     orders.unshift({ topic, shop, data, receivedAt: new Date().toISOString() });
//     // pushUpdate({ topic, shop, data, receivedAt: new Date().toISOString() });

//     // Optional: limit to last 50 orders to avoid memory overflow
//     if (orders.length > 50) orders.pop();

//     return NextResponse.json({ status: "success", order: data });
//   } catch (err) {
//     console.error("❌ Error receiving order:", err);
//     return NextResponse.json(
//       { status: "error", message: err.message },
//       { status: 500 }
//     );
//   }
// }

// // ✅ Handle GET (return stored orders)
// export async function GET() {
//   return NextResponse.json({ status: "success", orders });
// }

import { NextResponse } from "next/server";
import { sendOrderUpdate } from "../stream/route"; // 🔔 optional for SSE (will safely fail if unused)

let orders = [];

// ✅ POST: Handle incoming Shopify order
export async function POST(req) {
  try {
    const topic = req.headers.get("x-shopify-topic");
    const shop = req.headers.get("x-shop");

    const data = await req.json();
    console.log("🆕 Order received:", { topic, shop, id: data.id });

    const order = {
      topic,
      shop,
      data,
      receivedAt: new Date().toISOString(),
    };

    // Add to top of orders list
    orders.unshift(order);

    console.log("📦 All Orders:", orders);
    

    // Limit list to last 50 orders
    if (orders.length > 50) {
      orders.pop();
    }

    // 🔔 Optional: push via SSE if running locally or on a platform that supports it
    try {
      sendOrderUpdate(order); // Safe even if unused
    } catch (e) {
      console.warn("📡 SSE push failed (likely in Vercel):", e.message);
    }

    return NextResponse.json({ status: "success", order });
  } catch (err) {
    console.error("❌ Order POST error:", err);
    return NextResponse.json(
      { status: "error", message: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}

// ✅ GET: Return orders to the client
export async function GET() {
  return NextResponse.json({ status: "success", orders });
}
