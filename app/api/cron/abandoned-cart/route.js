import pool from "@/lib/db";
import { sendAbandonedCartEmail } from "@/lib/email";

export async function GET() {
  try {
    let totalRemindersSent = 0;

    // 🔔 Reminder 1: after 1 hour
    const [reminder1] = await pool.query(
      `SELECT * FROM checkouts 
       WHERE reminder_1 = 0 
       AND TIMESTAMPDIFF(MINUTE, updated_at, NOW()) >= 60`
    );

    for (const checkout of reminder1) {
      await sendAbandonedCartEmail(checkout, 1);
      await pool.query(`UPDATE checkouts SET reminder_1 = 1 WHERE id = ?`, [
        checkout.id,
      ]);
      totalRemindersSent++;
    }

    // 🔔 Reminder 2: after 24 hours
    const [reminder2] = await pool.query(
      `SELECT * FROM checkouts 
       WHERE reminder_2 = 0 
       AND TIMESTAMPDIFF(HOUR, updated_at, NOW()) >= 24`
    );

    for (const checkout of reminder2) {
      await sendAbandonedCartEmail(checkout, 2);
      await pool.query(`UPDATE checkouts SET reminder_2 = 1 WHERE id = ?`, [
        checkout.id,
      ]);
      totalRemindersSent++;
    }

    // 🔔 Reminder 3: after 3 days
    const [reminder3] = await pool.query(
      `SELECT * FROM checkouts 
       WHERE reminder_3 = 0 
       AND TIMESTAMPDIFF(DAY, updated_at, NOW()) >= 3`
    );

    for (const checkout of reminder3) {
      await sendAbandonedCartEmail(checkout, 3);
      await pool.query(`UPDATE checkouts SET reminder_3 = 1 WHERE id = ?`, [
        checkout.id,
      ]);
      totalRemindersSent++;
    }

    return new Response(
      `✅ Abandoned cart cron executed. Sent ${totalRemindersSent} reminders.`,
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Abandoned cart cron failed:", err);
    return new Response("❌ Abandoned cart cron failed", { status: 500 });
  }
}
