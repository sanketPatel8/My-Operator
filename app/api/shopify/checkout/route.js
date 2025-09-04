import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import cron from "node-cron";

// Database connection configuration
const dbConfig = {
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
};

// In-memory storage for scheduled reminders
let scheduledReminders = new Map();

// 🔹 DB connection helper
async function getDbConnection() {
  return mysql.createConnection(dbConfig);
}

// 🔹 Extract phone number
function extractPhoneDetails(checkoutData) {
  if (!checkoutData?.customer_phone) return null;
  return { phone: checkoutData.customer_phone.slice(-10) };
}

// 🔹 Send WhatsApp message
async function sendWhatsAppMessage(phoneNumber, templateName, templateContent, storeData) {
  const payload = {
    phone_number_id: storeData.phone_number_id,
    customer_country_code: "91",
    customer_number: phoneNumber,
    data: {
      type: "template",
      language: "en",
      context: {
        template_name: templateName,
        language: "en",
        body: templateContent.body.example || {},
        buttons: [
          {
            index: 0,
            id: templateContent.checkout_url || "https://example.com/checkout",
          },
        ],
      },
    },
  };

  const res = await fetch(`${process.env.NEXT_PUBLIC_BASEURL}/chat/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${storeData.whatsapp_api_key}`,
      "X-MYOP-COMPANY-ID": `${storeData.company_id}`,
    },
    body: JSON.stringify(payload),
  });

  return res.json();
}

// 🔹 Map dynamic values
function getMappedValue(field, data) {
  switch (field) {
    case "Name": return data.customer_first_name || "Customer";
    case "Order id": return String(data?.id || data?.token || "123456");
    case "Phone number": return data.customer_phone || "0000000000";
    case "Quantity":
      return Array.isArray(data.line_items)
        ? String(data.line_items.reduce((s, i) => s + (i.quantity || 0), 0))
        : "0";
    case "Total price": return data?.total_price || "00";
    default: return "";
  }
}

// 🔹 Build template
function buildTemplateContent(templateRows, data) {
  const content = { header: null, body: null, footer: null, buttons: [], checkout_url: data.checkout_url };
  const bodyExample = {};

  for (const row of templateRows) {
    const value = JSON.parse(row.value || "{}");
    switch (row.component_type) {
      case "HEADER": content.header = value; break;
      case "BODY":
        content.body = value;
        if (row.mapping_field && row.variable_name) {
          bodyExample[row.variable_name] = getMappedValue(row.mapping_field, data);
        }
        break;
      case "FOOTER": content.footer = value; break;
      case "BUTTONS":
        (value.buttons || [value]).forEach((btn) => {
          if (btn && Object.keys(btn).length > 0) content.buttons.push(btn);
        });
        break;
    }
  }

  if (content.body) content.body.example = bodyExample;
  return content;
}

// 🔹 Execute reminder
async function executeReminder(checkoutData, templateName, templateRows, storeData, reminderId, eventTitle) {
  const phoneDetails = extractPhoneDetails(checkoutData);
  if (!phoneDetails) return;

  const conn = await getDbConnection();

  // Check reminder status before sending
  const [rows] = await conn.execute(
    "SELECT reminder_1, reminder_2, reminder_3 FROM checkouts WHERE token = ? LIMIT 1",
    [checkoutData.token || checkoutData.id]
  );

  if (rows.length === 0) {
    await conn.end();
    return;
  }

  const reminderStatus = rows[0];

  if (
    (eventTitle === "Reminder 1" && reminderStatus.reminder_1 === 1) ||
    (eventTitle === "Reminder 2" && reminderStatus.reminder_2 === 1) ||
    (eventTitle === "Reminder 3" && reminderStatus.reminder_3 === 1)
  ) {
    await conn.end();
    return; // already sent
  }

  // Build template and send
  const templateContent = buildTemplateContent(templateRows, checkoutData);
  if (!templateContent) {
    await conn.end();
    return;
  }

  await sendWhatsAppMessage(phoneDetails.phone, templateName, templateContent, storeData);

  // Update correct reminder column
  let columnToUpdate = "";
  if (eventTitle === "Reminder 1") columnToUpdate = "reminder_1";
  if (eventTitle === "Reminder 2") columnToUpdate = "reminder_2";
  if (eventTitle === "Reminder 3") columnToUpdate = "reminder_3";

  if (columnToUpdate) {
    await conn.execute(
      `UPDATE checkouts SET ${columnToUpdate} = 1 WHERE token = ?`,
      [checkoutData.token || checkoutData.id]
    );
  }

  await conn.end();
  scheduledReminders.delete(reminderId);
}

// 🔹 CRON job: check reminders for all checkouts
async function checkRemindersForAllCheckouts() {
  const conn = await getDbConnection();
  const [checkouts] = await conn.execute("SELECT * FROM checkouts");
  await conn.end();

  for (const checkout of checkouts) {
    // Skip if all reminders sent
    if (checkout.reminder_3 === 1) continue;

    const checkoutData = JSON.parse(checkout.checkout_data || "{}");

    const conn2 = await getDbConnection();
    const [storeRows] = await conn2.execute("SELECT * FROM stores WHERE shop = ? LIMIT 1", [
      checkout.shop_url,
    ]);
    await conn2.end();

    if (storeRows.length === 0) continue;
    const storeData = storeRows[0];
    const storePhoneNumber = storeData.phonenumber;

    const reminderEvents = ["Reminder 1", "Reminder 2", "Reminder 3"];
    for (const eventTitle of reminderEvents) {
      if (
        (eventTitle === "Reminder 1" && checkout.reminder_1 === 1) ||
        (eventTitle === "Reminder 2" && checkout.reminder_2 === 1) ||
        (eventTitle === "Reminder 3" && checkout.reminder_3 === 1)
      ) continue;

      const conn3 = await getDbConnection();
      const [eventRows] = await conn3.execute(
        "SELECT template_id, template_data_id, status, delay FROM category_event WHERE title = ? AND phonenumber = ? AND store_id = ? LIMIT 1",
        [eventTitle, storePhoneNumber, storeData.id]
      );
      await conn3.end();

      if (eventRows.length === 0 || eventRows[0].status != 1) continue;
      const { template_id, template_data_id, delay } = eventRows[0];

      const conn4 = await getDbConnection();
      const [templateRows] = await conn4.execute(
        "SELECT template_name FROM template WHERE template_id = ? AND phonenumber = ? LIMIT 1",
        [template_id, storePhoneNumber]
      );
      const [templateVariableRows] = await conn4.execute(
        "SELECT * FROM template_variable WHERE template_data_id = ? ORDER BY template_variable_id",
        [template_data_id]
      );
      await conn4.end();

      if (templateRows.length === 0 || templateVariableRows.length === 0) continue;

      const templateName = templateRows[0].template_name;

      // ⏳ calculate reminder time
      const delayMinutes = delay || 60;
      const checkoutTime = new Date(checkout.created_at);
      const reminderTime = new Date(checkoutTime.getTime() + delayMinutes * 60 * 1000);

      if (new Date() >= reminderTime) {
        await executeReminder(
          { ...checkoutData, created_at: checkout.created_at, token: checkout.token, id: checkout.token },
          templateName,
          templateVariableRows,
          storeData,
          `${checkout.token}_${eventTitle}`,
          eventTitle
        );
      }
    }
  }
}

// 🔹 Run cron every 50 minutes
cron.schedule("* * * * *", async () => {
  console.log("⏳ Cron job running: checking reminders for all checkouts...");
  await checkRemindersForAllCheckouts();
});

// ✅ Handle POST (legacy manual trigger)
export async function POST(req) {
  return NextResponse.json({ status: "error", message: "POST disabled. Use cron instead." });
}

// ✅ Handle GET (list scheduled reminders in memory)
export async function GET() {
  const now = new Date();

  const remindersList = Array.from(scheduledReminders.entries()).map(([id, data]) => {
    const timeLeftMs = data.scheduledFor - now;
    return {
      id,
      eventTitle: data.eventTitle,
      templateName: data.templateName,
      scheduledFor: data.scheduledFor,
      timeLeftMinutes: Math.max(0, Math.round(timeLeftMs / 60000)),
      checkoutToken: data.checkoutData.token || data.checkoutData.id,
      shop: data.checkoutData.shop,
      processing: timeLeftMs <= 0 ? "processing" : "waiting"
    };
  });

  return NextResponse.json({ status: "success", scheduledReminders: remindersList });
}
