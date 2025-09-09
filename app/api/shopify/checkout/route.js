import { NextResponse } from "next/server";
import mysql from "mysql2/promise";


// Database connection configuration
const dbConfig = {
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
};

// 🔹 DB connection helper
async function getDbConnection() {
  return mysql.createConnection(dbConfig);
}

// 🔹 Parse delay string to minutes
function parseDelayToMinutes(delayValue) {
  if (!delayValue) return 60; // default 1 hour
  
  // If it's already a number, treat as minutes
  if (typeof delayValue === 'number') {
    return delayValue;
  }
  
  const delayStr = String(delayValue).toLowerCase().trim();
  
  // If it's just a number string, treat as minutes
  if (/^\d+$/.test(delayStr)) {
    return parseInt(delayStr);
  }
  
  // Parse text format like "2 hours", "30 minutes"
  const timeMatch = delayStr.match(/(\d+)\s*(minute|minutes|hour|hours|day|days)/);
  
  if (!timeMatch) return 60;
  
  const value = parseInt(timeMatch[1]);
  const unit = timeMatch[2];
  
  switch (unit) {
    case 'minute':
    case 'minutes':
      return value;
    case 'hour':
    case 'hours':
      return value * 60;
    case 'day':
    case 'days':
      return value * 60 * 24;
    default:
      return 60;
  }
}

// 🔹 Extract phone number
function extractPhoneDetails(checkoutData) {
  if (!checkoutData?.customer_phone) return null;
  return { phone: checkoutData.customer_phone.slice(-10) };
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

// 🔹 Process reminder for specific checkout and reminder type
async function processReminder(checkout, reminderType, storeData) {
  const conn = await getDbConnection();
  
  try {
    // Get reminder event details
    console.log(`🔍 Fetching event details for: ${reminderType}, phone: ${storeData.phonenumber}, store: ${storeData.id}`);
    const [eventRows] = await conn.execute(
      "SELECT title, template_id, template_data_id, status, delay FROM category_event WHERE title = ? AND phonenumber = ? AND store_id = ? AND status = 1 LIMIT 1",
      [reminderType, storeData.phonenumber, storeData.id]
    );

    if (eventRows.length === 0) {
      console.log(`❌ No event found for ${reminderType}`);
      return;
    }

    console.log(`📋 Event found:`, eventRows[0]);

    const { title, template_id, template_data_id, delay } = eventRows[0];
    const delayMinutes = parseDelayToMinutes(delay);

    console.log(`Processing ${title} for checkout ${checkout.token}, delay: ${delay} (${delayMinutes} minutes)`);

    // Calculate time difference
    const checkoutTime = new Date(checkout.updated_at);
    const currentTime = new Date();
    const timeDiffMinutes = Math.floor((currentTime - checkoutTime) / (1000 * 60));

    console.log(`Time difference: ${timeDiffMinutes} minutes, Required: ${delayMinutes} minutes`);

    // Check if enough time has passed
    if (timeDiffMinutes < delayMinutes) return;

    // Get template details
    const [templateRows] = await conn.execute(
      "SELECT template_name FROM template WHERE template_id = ? AND phonenumber = ? LIMIT 1",
      [template_id, storeData.phonenumber]
    );

    const [templateVariableRows] = await conn.execute(
      "SELECT * FROM template_variable WHERE template_data_id = ? ORDER BY template_variable_id",
      [template_data_id]
    );

    if (templateRows.length === 0 || templateVariableRows.length === 0) return;

    const templateName = templateRows[0].template_name;
    const checkoutData = JSON.parse(checkout.checkout_data || "{}");
    const phoneDetails = extractPhoneDetails(checkoutData);

    // Update reminder status regardless of phone details
    const reminderColumn = reminderType.toLowerCase().replace(' ', '_');

    if (!phoneDetails) {
      console.log(`📞 Phone number not found for checkout ${checkout.token}`);
      
      // Update reminder status to 1 even without phone details
      await conn.execute(
        `UPDATE checkouts SET ${reminderColumn} = 1 WHERE token = ?`,
        [checkout.token]
      );

      console.log(`🔄 Database updated: ${reminderColumn} = 1 for checkout ${checkout.token} (phone not found)`);
      return;
    }

    // Build and send message
    const templateContent = buildTemplateContent(templateVariableRows, checkoutData);
    if (!templateContent) {
      console.log(`❌ Failed to build template content for checkout ${checkout.token}`);
      return;
    }

    console.log(`📤 Sending WhatsApp message...`);
    const sendResult = await sendWhatsAppMessage(phoneDetails.phone, templateName, templateContent, storeData);
    console.log(`📤 WhatsApp API Response:`, sendResult);

    // Update reminder status after successful message sending
    await conn.execute(
      `UPDATE checkouts SET ${reminderColumn} = 1 WHERE token = ?`,
      [checkout.token]
    );

    console.log(`🔄 Database updated: ${reminderColumn} = 1 for checkout ${checkout.token}`);
    console.log(`📱 Message sent successfully to ${phoneDetails.phone}`);
    console.log(`✅ ${title} sent successfully for checkout ${checkout.token}`);

  } catch (error) {
    console.error(`❌ Error processing ${reminderType} for checkout ${checkout.token}:`, error);
  } finally {
    await conn.end();
  }
}

// 🔹 Main cron function - check reminders for all checkouts
async function checkRemindersForAllCheckouts() {
  const conn = await getDbConnection();
  
  try {
    // Get all checkouts that haven't received all reminders
    const [checkouts] = await conn.execute(
      "SELECT * FROM checkouts WHERE reminder_1 = 0 OR reminder_2 = 0 OR reminder_3 = 0"
    );

    console.log(`Found ${checkouts.length} checkouts to process`);

    for (const checkout of checkouts) {
      // Get store data
      const [storeRows] = await conn.execute(
        "SELECT * FROM stores WHERE shop = ? LIMIT 1", 
        [checkout.shop_url]
      );

      if (storeRows.length === 0) continue;
      const storeData = storeRows[0];

      // Process each reminder type
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

  } catch (error) {
    console.error("❌ Error in checkRemindersForAllCheckouts:", error);
  } finally {
    await conn.end();
  }
}



// ✅ Handle POST (disabled)
export async function POST() {
  return NextResponse.json({ 
    status: "error", 
    message: "POST disabled. Reminders are handled by cron job." 
  });
}

// ✅ Handle GET (show reminder status)
export async function GET() {
  const conn = await getDbConnection();
  
  try {
    const [pendingReminders] = await conn.execute(`
      SELECT 
        token,
        shop_url,
        updated_at,
        reminder_1,
        reminder_2,
        reminder_3,
        TIMESTAMPDIFF(MINUTE, updated_at, NOW()) as minutes_since_checkout
      FROM checkouts 
      WHERE reminder_1 = 0 OR reminder_2 = 0 OR reminder_3 = 0
      ORDER BY updated_at DESC
      LIMIT 50
    `);

    return NextResponse.json({ 
      status: "success", 
      pendingReminders,
      totalPending: pendingReminders.length,
      cronStatus: "active",
      lastRun: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({ 
      status: "error", 
      message: error.message 
    });
  } finally {
    await conn.end();
  }
}