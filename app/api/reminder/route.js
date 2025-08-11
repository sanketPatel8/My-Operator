import { db } from "@/lib/db";
import { sendWhatsApp } from "@/utils/whatsapp";

export async function GET() {
  // 30 mins old carts, reminder not sent
  const [rows] = await db.query(`
    SELECT * FROM abandoned_checkouts
    WHERE reminder_sent = FALSE
    AND created_at < NOW() - INTERVAL 30 MINUTE
  `);

  for (const row of rows) {
    const message = `👋 You left ${
      JSON.parse(row.products).length
    } items in your cart. Complete your order now!`;
    await sendWhatsApp(row.phone, message);

    await db.query(
      `
      UPDATE abandoned_checkouts
      SET reminder_sent = TRUE
      WHERE id = ?
    `,
      [row.id]
    );
  }

  return new Response(JSON.stringify({ success: true }));
}
