// import pool from "@/lib/db";
// import { NextResponse } from "next/server";
// // make sure this path is correct

// export async function POST(req) {
//   try {
//     const body = await req.json();
//     const { orderId } = body;

//     if (!orderId) {
//       return NextResponse.json(
//         { success: false, message: "orderId is required" },
//         { status: 400 }
//       );
//     }

//     // Run the query
//     const [rows] = await pool.query(
//       `SELECT
//           pco.shop,
//           pco.order_id,
//           s.access_token
//        FROM placed_code_order pco
//        JOIN stores s ON s.shop = pco.shop
//        WHERE pco.id = ?`,
//       [orderId]
//     );

//     if (rows.length === 0) {
//       return NextResponse.json(
//         { success: false, message: "Order not found" },
//         { status: 404 }
//       );
//     }

//     console.log(rows, "rows");

//     // Return the first row (should be only one)
//     return NextResponse.json({ success: true, data: rows[0] }, { status: 200 });
//   } catch (error) {
//     console.error("POST /api/place-order error:", error);
//     return NextResponse.json(
//       { success: false, message: "Internal Server Error" },
//       { status: 500 }
//     );
//   }
// }

import pool from "@/lib/db";
import { NextResponse } from "next/server";
import fetch from "node-fetch"; // if you are using Node < 18

export async function POST(req) {
  try {
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "orderId is required" },
        { status: 400 }
      );
    }

    // 1️⃣ Fetch shop and access_token from DB
    const [rows] = await pool.query(
      `SELECT 
          pco.shop,
          pco.order_id,
          s.access_token
       FROM placed_code_order pco
       JOIN stores s ON s.shop = pco.shop
       WHERE pco.id = ?`,
      [orderId]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    const { shop, order_id, access_token } = rows[0];

    console.log(rows, "rows");

    // 2️⃣ Call Shopify API to cancel the order
    const shopifyUrl = `https://${shop}/admin/api/2025-07/orders/${order_id}/cancel.json`;
    const cancelResponse = await fetch(shopifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": access_token,
      },
      body: JSON.stringify({
        reason: "customer",
        email: true,
        restock: true,
      }),
    });

    const cancelData = await cancelResponse.json();

    if (!cancelResponse.ok) {
      return NextResponse.json(
        { success: false, message: "Failed to cancel order", data: cancelData },
        { status: cancelResponse.status }
      );
    }

    // 3️⃣ Return success
    return NextResponse.json(
      {
        success: true,
        message: "Order cancelled successfully",
        data: cancelData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/place-order error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
