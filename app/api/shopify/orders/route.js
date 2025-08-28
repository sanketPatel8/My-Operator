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
import { Server } from "socket.io";

let orders = [];

// Helper to initialize Socket.io once
function getIO(res) {
  if (!res.socket.server.io) {
    console.log("⚡ Setting up Socket.io server...");
    const io = new Server(res.socket.server);
    res.socket.server.io = io;
  }
  return res.socket.server.io;
}

// Handle POST (receive new order)
export async function POST(req, res) {
  try {
    const topic = req.headers.get("x-shopify-topic");
    const shop = req.headers.get("x-shop");
    const data = await req.json();

    console.log(`📦 Order received [${topic}] from shop ${shop}:`, data);

    // Store order in memory (last 50)
    orders.unshift({ topic, shop, data, receivedAt: new Date().toISOString() });
    if (orders.length > 50) orders.pop();

    // Emit new order notification
    const io = getIO(res);
    io.emit("new_order", { topic, shop, data });

    return NextResponse.json({ status: "success", order: data });
  } catch (err) {
    console.error("❌ Error receiving order:", err);
    return NextResponse.json(
      { status: "error", message: err.message },
      { status: 500 }
    );
  }
}

// Handle GET (return stored orders)
export async function GET() {
  return NextResponse.json({ status: "success", orders });
}
