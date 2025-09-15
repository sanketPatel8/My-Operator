// app/api/shopify/orders/route.js
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();

    console.log("📥 Received from Remix:", body);

    // 🔹 Example: process or save data here
    // await saveOrderToDB(body);

    return NextResponse.json(
      { success: true, message: "Order received", data: body },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error in Next.js API:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
