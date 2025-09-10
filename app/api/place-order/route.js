import pool from "@/lib/db";
import { NextResponse } from "next/server";
import fetch from "node-fetch"; // required if Node < 18

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

    console.log(rows, "Fetched order and store details");

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

    // 3️⃣ If Shopify cancel fails, do not delete order
    if (!cancelResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to cancel order on Shopify",
          data: cancelData,
        },
        { status: cancelResponse.status }
      );
    }

    // 4️⃣ Delete the order from placed_code_order only after successful cancellation
    await pool.query(`DELETE FROM placed_code_order WHERE id = ?`, [orderId]);

    console.log(`Order ${orderId} deleted from placed_code_order`);

    // 5️⃣ Return success response
    return NextResponse.json(
      {
        success: true,
        message: "Order cancelled successfully and deleted from DB",
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
