// File: /app/api/cron/reminders/route.js

import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import { getISTDateTime, getISTDateTimeString } from "@/lib/time";

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

function logWithTime(...args) {
  const now = getISTDateTimeString(); // Use string version for logging
  console.log(`[${now}]`, ...args);
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



// 🔹 Map dynamic values
function getMappedValue(field, data, customerData) {


  switch (field) {
    case "Name":
      return customerData.first_name || "Customer";
    case "Order id":
      return String(data?.id || data?.token || "123456");
    case "Phone number":
      return customerData.phone || "0000000000";
    case "Quantity":
      return Array.isArray(data.line_items)
        ? String(
            data.line_items.reduce((sum, item) => sum + (item.quantity || 0), 0)
          )
        : "0";
    case "Total price":
      return data?.total_price || "00";
    default:
      return "";
  }
}

// 🔹 Build template content
function buildTemplateContent(templateRows, data, abandoned_checkout_url, customerData, image_id) {
  const content = {
    header: null,
    body: null,
    footer: null,
    buttons: [],
    checkout_url: data.abandoned_checkout_url,
  };
  const bodyExample = {};

  for (const row of templateRows) {
    const value = JSON.parse(row.value || "{}");
    console.log("value",value);
    
    switch (row.component_type) {
      case "HEADER":
        content.header = value;
        console.log("value for header", value);
        const media = value.media_id;
        console.log("media id ", media);
        if (image_id != null) {
            content.header = { media_id: image_id };
        } else {
            content.header = { media_id: media };
        }
        break;
      case "BODY":
        content.body = value;
        if (row.mapping_field && row.variable_name) {
          bodyExample[row.variable_name] = getMappedValue(
            row.mapping_field,
            customerData,
            data
          );
        }
        break;
      case "FOOTER":
        content.footer = value;
        break;
      case "BUTTONS":
        if (value && typeof value === 'object') {
            // Check if value.buttons exists and is an array
            if (value.buttons && Array.isArray(value.buttons)) {
              if (content.buttons.length === 0) {
                const output = value.buttons.map((button, index) => {
                  if (button && button.example && typeof button.example === 'object') {
                    const key = Object.keys(button.example)[0]; 
                    const placeholderRegex = new RegExp(`{{${key}}}`, 'g');
                    console.log(placeholderRegex,"placeholder");

                    console.log("checkout url", abandoned_checkout_url);
                    
                    // Replace {{key}} in URL with the specific value
                    const replacedUrl = button.url.replace(placeholderRegex, abandoned_checkout_url);
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
async function sendWhatsAppMessage(phonenumber, templateName, content, store) {
  const payload = {
    phone_number_id: store.phone_number_id,
    customer_country_code: "91",
    customer_number: phonenumber,
    data: {
      type: "template",
      language: "en",
      context: {
        template_name: templateName,
        language: "en",
        header: templateContent.header || {},
        body: content.body.example || {},
        buttons: content.buttons || [],
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

  const result = await res.json();
    console.log("✅ Message sent successfully:", result);
    return result;
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
    
    // Convert delay to number and treat as minutes
    const delayMinutes = parseDelayToMinutes(delay) || 60; // Default to 60 minutes if invalid

    const checkoutTime = new Date(checkout.updated_at);
    const currentTime = getISTDateTime(); // Now returns Date object
    const timeDiffMinutes = Math.floor(
      (currentTime - checkoutTime) / (1000 * 60)
    );

    console.log("checkout time", checkoutTime);
    console.log("current time", currentTime);

    logWithTime(`🕒 Time since checkout updated: ${timeDiffMinutes} minutes (Required: ${delayMinutes} minutes)`);

    // Skip if not enough time has passed
    if (timeDiffMinutes < delayMinutes) {
      logWithTime(`⏳ Skipping ${reminderType} for ${checkout.token}, not enough time passed.`);
      return;
    }

    const [templateRows] = await conn.execute(
      "SELECT template_name FROM template WHERE template_id = ? AND phonenumber = ? LIMIT 1",
      [template_id, storeData.phonenumber]
    );

    const [templateVars] = await conn.execute(
      "SELECT * FROM template_variable WHERE template_data_id = ? ORDER BY template_variable_id",
      [template_data_id]
    );

    if (templateRows.length === 0 || templateVars.length === 0) return;

    console.log("token for checkout", checkout.token);

    const templateName = templateRows[0].template_name;
    const checkoutData = JSON.parse(checkout.checkout_data || "{}");
    const abandoned_checkout_url = checkout.abandoned_checkout_url;

    console.log("checkout data", checkoutData);
    console.log("checkout url", abandoned_checkout_url);

    
    const [getphone] = await conn.execute(
      "SELECT customer FROM checkouts WHERE reminder_1 = 0 OR reminder_2 = 0 OR reminder_3 = 0 AND token = ?",
      [checkout.token]
    );

    
    

    const { customer } = getphone[0];

    console.log("getphone[0]", getphone[0]);


    
   const customerData = JSON.parse(customer);
   console.log("customer data : ", customerData);
   const phonenumber = customerData.phone.replace('+91', '');
   console.log(phonenumber, "phonenumber");
    
   const [templateimage] = await conn.execute(
      'SELECT tamplate_image FROM template_variable WHERE template_data_id = ?',
      [template_data_id]
    );

    console.log("template image row", templateimage);
    

    const image_id = templateimage[0]?.tamplate_image;

    console.log("First template image:", image_id);

    const reminderColumn = reminderType.toLowerCase().replace(" ", "_");
    const templateContent = buildTemplateContent(templateVars, checkoutData, abandoned_checkout_url, customerData, image_id);
    
    await sendWhatsAppMessage(
      phonenumber,
      templateName,
      templateContent,
      storeData
    );

    console.log("message sent success");

    // Mark reminder as sent
    await conn.execute(
      `UPDATE checkouts SET ${reminderColumn} = 1 WHERE token = ?`,
      [checkout.token]
    );

    console.log("status updated");
    
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

    logWithTime(`📋 Found ${checkouts.length} checkouts to process`);

    for (const checkout of checkouts) {
      logWithTime(`🔍 Processing checkout token: ${checkout.token} for shop: ${checkout.shop_url}`);
      const [storeRows] = await conn.execute(
        "SELECT * FROM stores WHERE shop = ? LIMIT 1",
        [checkout.shop_url]
      );

      if (storeRows.length === 0) {
        console.log(`⚠️ No store found for shop: ${checkout.shop_url}`);
        continue;
      }
      
      const storeData = storeRows[0];

      const reminders = [
        { type: "Reminder 1", sent: checkout.reminder_1 },
        { type: "Reminder 2", sent: checkout.reminder_2 },
        { type: "Reminder 3", sent: checkout.reminder_3 },
      ];

      for (const reminder of reminders) {
        if (reminder.sent === 0) {
          await processReminder(checkout, reminder.type, storeData);
        }
      }
    }
  } catch (err) {
    console.error("❌ Error checking reminders:", err);
    throw err;
  } finally {
    await conn.end();
  }
}

// 🔹 Verify cron request security
function verifyCronRequest(request) {
  // Check for authorization header
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // If CRON_SECRET is set, verify it
  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error("❌ Invalid cron secret");
      return false;
    }
  }

  // Log request details for monitoring
  const userAgent = request.headers.get("user-agent");
  const cronJobHeader = request.headers.get("x-cron-job");

  console.log("🔍 Cron request details:", {
    userAgent,
    cronJobHeader,
    hasAuth: !!authHeader,
    timestamp: getISTDateTimeString()
  });

  return true;
}

// 🔹 GET endpoint for cron jobs
export async function GET(request) {
  console.log("⏰ Cron job started at", getISTDateTimeString());
  const startTime = getISTDateTime(); // Date object for calculation
  console.log("start", startTime);

  try {
    await checkRemindersForAllCheckouts();
    
    const endTime = getISTDateTime(); // Date object for calculation
    const executionTime = endTime - startTime; // Now this will work correctly
    console.log(`✅ Cron job completed in ${executionTime}ms`);

    return NextResponse.json({
      status: "success",
      message: "Cron job executed successfully",
      executionTime: `${executionTime}ms`,
      timestamp: getISTDateTimeString(),
    });
  } catch (error) {
    console.error("❌ Cron job failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Cron job failed",
        error: error.message,
        timestamp: getISTDateTimeString(),
      },
      { status: 500 }
    );
  }
}

// 🔹 POST endpoint (alternative for some cron services)
export async function POST(request) {
  // Some cron services prefer POST requests
  return GET(request);
}

// Block other HTTP methods
export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}