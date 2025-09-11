import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import { getISTDateTime, getISTDateTimeString } from "@/lib/time";

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



// 🔹 Map dynamic values (updated for order_delivered structure)
function getMappedValue(field, data) {
  switch (field) {
    case "Name": return data.customer_first_name || "Customer";
    case "Order id": return String(data?.id || data?.order_number || "123456");
    case "Phone number": return data.customer_phone || "0000000000";
    case "Quantity": return String(data.quantity || "1"); // assuming quantity is stored in order_delivered
    case "Total price": return String(data.total_price || "00");
    default: return "";
  }
}

// 🔹 Build template content
function buildTemplateContent(templateRows, data) {
  const content = { header: null, body: null, footer: null, buttons: [] };
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
        if (value && typeof value === 'object') {
            // Check if value.buttons exists and is an array
            if (value.buttons && Array.isArray(value.buttons)) {
              if (content.buttons.length === 0) {
                const output = value.buttons.map((button, index) => {
                  if (button && button.example && typeof button.example === 'object') {
                    const key = Object.keys(button.example)[0]; // e.g., 'approve' or 'cancel'
                    const placeholderRegex = new RegExp(`{{${key}}}`, 'g');
                    console.log(placeholderRegex,"placeholder");

                    // Replace {{key}} in URL with the specific value
                    const replacedUrl = button.url.replace(placeholderRegex, "https://google.com");
                    console.log("replaced url", replacedUrl);
                    

                    return {
                      index: button.index !== undefined ? button.index : index,
                      [key]: replacedUrl
                    };
                  }

                  // Fallback for malformed button data
                  return {
                    index: index,
                    link: '#'
                  };
                });

                // ✅ Return processed button array here
                console.log("✅ Processed buttons:", ...output);
                content.buttons.push(...output); // Insert into template
              }
            } else {
              console.warn("⚠️ value.buttons is not an array or doesn't exist:", value);
            }
          } else {
            console.warn("⚠️ Button value is null or invalid:", value);
          }
        break;
    }
  }

  if (content.body) content.body.example = bodyExample;
  return content;
}

// 🔹 Send WhatsApp message
async function sendWhatsAppMessage(phonenumber, templateName, templateContent, storeData) {
  const payload = {
    phone_number_id: storeData.phone_number_id,
    customer_country_code: "91",
    customer_number: phonenumber,
    data: {
      type: "template",
      language: "en",
      context: {
        template_name: templateName,
        language: "en",
        body: templateContent.body.example || {},
        buttons: templateContent.buttons || [],
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

// 🔹 Process reminder for specific order and reminder type
async function processReminder(order, reminderType, storeData) {
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

    console.log(`Processing ${title} for order ${order.id}, delay: ${delay} (${delayMinutes} minutes)`);

    // Calculate time difference from updated_at
    const deliveryTime = new Date(order.created_at);
    const currentTime = getISTDateTime();
    const timeDiffMinutes = Math.floor((currentTime - deliveryTime) / (1000 * 60));

    console.log(`Time since delivery: ${timeDiffMinutes} minutes, Required: ${delayMinutes} minutes`);
    console.log("times:::", order.created_at, currentTime, deliveryTime);
    

    // Check if enough time has passed since delivery
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
    const [getphone] = await conn.execute(
      "SELECT customer_phone FROM order_delivered WHERE reorder_reminder = 0 OR order_feedback = 0 OR reminder_3 = 0 AND id = ?",
      [order.id]
    );


    const { customer_phone } = getphone[0];

    console.log("getphone[0]", getphone[0]);
    

    console.log("customer_phone", customer_phone);
    

    const phonenumber =  customer_phone.slice(-10)

    console.log(phonenumber,"phone details");

    // Determine column name based on reminder type
    const reminderColumn = reminderType === 'Reorder Reminder' ? 'reorder_reminder' : 'order_feedback';

    if (!phoneDetails) {
      console.log(`📞 Phone number not found for order ${order.id}`);
      
      // Update reminder status to 1 even without phone details
      await conn.execute(
        `UPDATE order_delivered SET ${reminderColumn} = 1 WHERE id = ?`,
        [order.id]
      );

      console.log(`🔄 Database updated: ${reminderColumn} = 1 for order ${order.id} (phone not found)`);
      
      // Check if both reminders are now complete and delete if so
      await checkAndDeleteCompletedOrder(conn, order.id);
      return;
    }

    // Build and send message
    const templateContent = buildTemplateContent(templateVariableRows, order);
    if (!templateContent) {
      console.log(`❌ Failed to build template content for order ${order.id}`);
      return;
    }

    console.log(`📤 Sending WhatsApp message...`);
    const sendResult = await sendWhatsAppMessage(phonenumber, templateName, templateContent, storeData);
    console.log(`📤 WhatsApp API Response:`, sendResult);

    // Update reminder status after successful message sending
    await conn.execute(
      `UPDATE order_delivered SET ${reminderColumn} = 1 WHERE id = ?`,
      [order.id]
    );

    console.log(`🔄 Database updated: ${reminderColumn} = 1 for order ${order.id}`);
    console.log(`📱 Message sent successfully to ${phoneDetails.phone}`);
    console.log(`✅ ${title} sent successfully for order ${order.id}`);

    // Check if both reminders are now complete and delete if so
    await checkAndDeleteCompletedOrder(conn, order.id);

  } catch (error) {
    console.error(`❌ Error processing ${reminderType} for order ${order.id}:`, error);
  } finally {
    await conn.end();
  }
}

// 🔹 Check and delete order if both reminders are complete
async function checkAndDeleteCompletedOrder(conn, orderId) {
  try {
    // Get current status of both reminders
    const [orderRows] = await conn.execute(
      "SELECT reorder_reminder, order_feedback FROM order_delivered WHERE id = ? LIMIT 1",
      [orderId]
    );

    if (orderRows.length === 0) return;

    const { reorder_reminder, order_feedback } = orderRows[0];

    // If both reminders are complete (status = 1), delete the row
    if (reorder_reminder === 1 && order_feedback === 1) {
      await conn.execute(
        "DELETE FROM order_delivered WHERE id = ?",
        [orderId]
      );

      console.log(`🗑️ Deleted completed order: ${orderId} (both reminders sent)`);
    }

  } catch (error) {
    console.error(`❌ Error checking/deleting completed order ${orderId}:`, error);
  }
}

// 🔹 Main cron function - check reminders for all delivered orders
async function checkRemindersForAllDeliveredOrders() {
  const conn = await getDbConnection();
  
  try {
    // Get all delivered orders that haven't received all reminders
    const [orders] = await conn.execute(
      "SELECT * FROM order_delivered WHERE reorder_reminder = 0 OR order_feedback = 0"
    );

    console.log(`Found ${orders.length} delivered orders to process`);
    console.log("full data", orders);
    

    for (const order of orders) {
      // Get store data
      const [storeRows] = await conn.execute(
        "SELECT * FROM stores WHERE shop = ? LIMIT 1", 
        [order.shop_url]
      );

      if (storeRows.length === 0) continue;
      const storeData = storeRows[0];

      // Process each reminder type
      const reminders = [
        { type: 'Reorder Reminder', sent: order.reorder_reminder },
        { type: 'Order Feedback', sent: order.order_feedback }
      ];

      for (const reminder of reminders) {
        if (reminder.sent === 0) {
          await processReminder(order, reminder.type, storeData);
        }
      }
    }

  } catch (error) {
    console.error("❌ Error in checkRemindersForAllDeliveredOrders:", error);
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

    await checkRemindersForAllDeliveredOrders();

    const [pendingReminders] = await conn.execute(`
      SELECT 
        id,
        shop_url,
        customer_first_name,
        customer_email,
        customer_phone,
        updated_at,
        reorder_reminder,
        created_at,
        updated_at,
        order_feedback
      FROM order_delivered 
      WHERE reorder_reminder = 0 OR order_feedback = 0
      ORDER BY updated_at DESC
      LIMIT 50
    `);

    return NextResponse.json({ 
      status: "success", 
      pendingReminders,
      totalPending: pendingReminders.length,
      cronStatus: "active",
      lastRun: getISTDateTimeString()
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

// Export the main cron function for external use
export { checkRemindersForAllDeliveredOrders };