// File: /app/api/cron/reminders/route.js

import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

// 🔹 Database connection
const dbConfig = {
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
};

async function getDbConnection() {
  return mysql.createConnection(dbConfig);
}

// 🔹 Parse delay string to minutes
function parseDelayToMinutes(delayValue) {
  if (!delayValue) return 60;
  if (typeof delayValue === 'number') return delayValue;

  const delayStr = String(delayValue).toLowerCase().trim();
  if (/^\d+$/.test(delayStr)) return parseInt(delayStr);

  const match = delayStr.match(/(\d+)\s*(minute|minutes|hour|hours|day|days)/);
  if (!match) return 60;

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'minute':
    case 'minutes': return value;
    case 'hour':
    case 'hours': return value * 60;
    case 'day':
    case 'days': return value * 60 * 24;
    default: return 60;
  }
}

// 🔹 Extract phone number
function extractPhoneDetails(data) {
  if (!data?.customer_phone) return null;
  return { phone: data.customer_phone.slice(-10) };
}

// 🔹 Map dynamic values
function getMappedValue(field, data) {
  switch (field) {
    case "Name": return data.customer_first_name || "Customer";
    case "Order id": return String(data?.id || data?.token || "123456");
    case "Phone number": return data.customer_phone || "0000000000";
    case "Quantity":
      return Array.isArray(data.line_items)
        ? String(data.line_items.reduce((sum, item) => sum + (item.quantity || 0), 0))
        : "0";
    case "Total price": return data?.total_price || "00";
    default: return "";
  }
}

// 🔹 Build template content
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

// 🔹 Send WhatsApp message
async function sendWhatsAppMessage(phone, templateName, content, store) {
  const payload = {
    phone_number_id: store.phone_number_id,
    customer_country_code: "91",
    customer_number: phone,
    data: {
      type: "template",
      language: "en",
      context: {
        template_name: templateName,
        language: "en",
        body: content.body.example || {},
        buttons: [
          {
            index: 0,
            id: content.checkout_url || "https://example.com/checkout",
          },
        ],
      },
    },
  };

  const res = await fetch(`${process.env.NEXT_PUBLIC_BASEURL}/chat/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${store.whatsapp_api_key}`,
      "X-MYOP-COMPANY-ID": `${store.company_id}`,
    },
    body: JSON.stringify(payload),
  });

  return res.json();
}

// 🔹 Process reminder
async function processReminder(checkout, reminderType, storeData) {
  const conn = await getDbConnection();

  try {
    const [eventRows] = await conn.execute(
      "SELECT title, template_id, template_data_id, status, delay FROM category_event WHERE title = ? AND phonenumber = ? AND store_id = ? AND status = 1 LIMIT 1",
      [reminderType, storeData.phonenumber, storeData.id]
    );

    if (eventRows.length === 0) return;

    const { title, template_id, template_data_id, delay } = eventRows[0];
    const delayMinutes = parseDelayToMinutes(delay);

    const checkoutTime = new Date(checkout.updated_at);
    const currentTime = new Date();
    const timeDiffMinutes = Math.floor((currentTime - checkoutTime) / (1000 * 60));

    if (timeDiffMinutes < delayMinutes) return;

    const [templateRows] = await conn.execute(
      "SELECT template_name FROM template WHERE template_id = ? AND phonenumber = ? LIMIT 1",
      [template_id, storeData.phonenumber]
    );

    const [templateVars] = await conn.execute(
      "SELECT * FROM template_variable WHERE template_data_id = ? ORDER BY template_variable_id",
      [template_data_id]
    );

    if (templateRows.length === 0 || templateVars.length === 0) return;

    const templateName = templateRows[0].template_name;
    const checkoutData = JSON.parse(checkout.checkout_data || "{}");
    const phoneDetails = extractPhoneDetails(checkoutData);

    const reminderColumn = reminderType.toLowerCase().replace(' ', '_');

    if (!phoneDetails) {
      await conn.execute(`UPDATE checkouts SET ${reminderColumn} = 1 WHERE token = ?`, [checkout.token]);
      return;
    }

    const templateContent = buildTemplateContent(templateVars, checkoutData);
    const sendResult = await sendWhatsAppMessage(phoneDetails.phone, templateName, templateContent, storeData);

    await conn.execute(`UPDATE checkouts SET ${reminderColumn} = 1 WHERE token = ?`, [checkout.token]);
    console.log(`✅ Sent ${reminderType} to ${phoneDetails.phone}`, sendResult);

  } catch (error) {
    console.error(`❌ Error processing ${reminderType}:`, error);
  } finally {
    await conn.end();
  }
}

// 🔹 Main runner
async function checkRemindersForAllCheckouts() {
  const conn = await getDbConnection();

  try {
    const [checkouts] = await conn.execute(
      "SELECT * FROM checkouts WHERE reminder_1 = 0 OR reminder_2 = 0 OR reminder_3 = 0"
    );

    for (const checkout of checkouts) {
      const [storeRows] = await conn.execute(
        "SELECT * FROM stores WHERE shop = ? LIMIT 1",
        [checkout.shop_url]
      );

      if (storeRows.length === 0) continue;
      const storeData = storeRows[0];

      const reminders = [
        { type: 'Reminder 1', sent: checkout.reminder_1 },
        { type: 'Reminder 2', sent: checkout.reminder_2 },
        { type: 'Reminder 3', sent: checkout.reminder_3 }
      ];

      for (const reminder of reminders) {
        if (reminder.sent === 0) {
          await processReminder(checkout, reminder.type, storeData);
        }
      }
    }
  } catch (err) {
    console.error("❌ Error checking reminders:", err);
  } finally {
    await conn.end();
  }
}
// 🔹 Verify cron request is from Vercel
function verifyCronRequest(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // If you set a CRON_SECRET environment variable
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return false;
  }
  
  // Additional verification - check if request is from Vercel
  const userAgent = request.headers.get('user-agent');
  if (!userAgent || !userAgent.includes('vercel')) {
    console.warn('Suspicious cron request:', { userAgent, ip: request.ip });
  }
  
  return true;
}

// ... (all your existing functions remain the same)

// 🔹 Vercel Cron Job Entry
export async function GET(request) {
  // Verify the request is legitimate
  if (!verifyCronRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized" }, 
      { status: 401 }
    );
  }

  console.log("⏰ Cron started at", new Date().toISOString());
  
  try {
    await checkRemindersForAllCheckouts();
    
    return NextResponse.json({
      status: "success",
      message: "Cron job executed successfully",
      time: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Cron job failed:", error);
    
    return NextResponse.json({
      status: "error", 
      message: "Cron job failed",
      error: error.message,
      time: new Date().toISOString()
    }, { status: 500 });
  }
}

// Block other HTTP methods
export async function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}