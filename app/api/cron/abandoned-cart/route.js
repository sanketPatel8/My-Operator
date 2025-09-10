import { NextResponse } from "next/server";
import pool from "@/lib/db"; // adjust this path to your db connection

export async function GET() {
  try {
    // 1️⃣ Find abandoned checkouts older than 30 mins and not yet reminded
    const [abandonedCarts] = await pool.query(
      `SELECT * FROM checkouts WHERE reminder_1 = 0`
    );

    console.log(abandonedCarts, "abandonedCarts data");

    if (abandonedCarts.length === 0) {
      console.log("✅ No abandoned carts found.");
      return NextResponse.json({ message: "No abandoned carts" });
    }

    console.log(`⚠️ Found ${abandonedCarts.length} abandoned checkouts`);

    for (const cart of abandonedCarts) {
      // 2️⃣ Parse line_items JSON if it exists
      let items = [];
      try {
        if (cart.line_items) {
          items = JSON.parse(cart.line_items);
        }
      } catch (err) {
        console.error("❌ Failed to parse line_items JSON:", err);
      }

      // 3️⃣ Log abandoned checkout details
      console.log("🛒 Abandoned Checkout Alert:");
      console.log(`Checkout ID: ${cart.id}`);
      console.log(
        `Customer: ${cart.customer_first_name} ${cart.customer_last_name}`
      );
      console.log(`Email: ${cart.customer_email}`);
      console.log(`Phone: ${cart.customer_phone}`);
      console.log(`updated_at: ${cart.updated_at}`);
      console.log(`Total Price: ${cart.total_price} ${cart.currency}`);
      console.log("Items:", items);
      console.log("-----------------------------");

      // 4️⃣ Mark reminder_1 as sent
      await pool.query(
        `UPDATE checkouts 
         SET reminder_1 = 1, updated_at = NOW() 
         WHERE id = ?`,
        [cart.id]
      );
    }

    return NextResponse.json({
      message: "Abandoned checkouts processed",
      count: abandonedCarts.length,
    });
  } catch (error) {
    console.error("❌ Error in abandoned checkout cron:", error);
    return NextResponse.json(
      { error: "Failed to process abandoned checkouts" },
      { status: 500 }
    );
  }
}
