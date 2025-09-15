// app/api/shopify/orders/route.js
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    // ✅ Read JSON payload
    const payload = await request.json();

    // ✅ Read headers (Shopify metadata)
    const headers = Object.fromEntries(request.headers.entries());
    const topic = headers["x-shopify-topic"] || "";
    const shop = headers["x-shopify-shop-domain"] || "";
    const eventId = headers["x-shopify-event-id"] || "";
    const webhookId = headers["x-shopify-webhook-id"] || "";

    console.log("📥 Shopify Webhook received:");
    console.log("Topic:", topic);
    console.log("Shop:", shop);
    console.log("Event ID:", eventId);
    console.log("Webhook ID:", webhookId);
    console.log("Payload:", payload);

    // 👉 Do whatever you need here (DB insert, trigger email, etc.)
    if (topic === "orders/updated" || topic === "orders/create") {
      const orderId = payload?.id;
      console.log("✅ Order ID:", orderId);
      // Example: save to DB or trigger workflow
    }

    // ✅ Respond quickly (Shopify requires <5s response)
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error handling Shopify webhook:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
