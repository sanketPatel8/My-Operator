import { NextResponse } from "next/server";
import mysql from 'mysql2/promise';
import cron from 'node-cron';
 
// Database connection configuration
const dbConfig = {
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME
};

// In-memory storage for scheduled reminders
let scheduledReminders = new Map();

// Helper function to create database connection
async function getDbConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    return connection;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Helper function to extract phone number from checkout data
function extractPhoneDetails(checkoutData) {
  try {
    if (!checkoutData || !checkoutData.customer_phone) {
      console.warn('⚠️ No phone number found in checkout data');
      return null;
    }
    
    let phone = checkoutData.customer_phone;
    phone = phone.slice(-10);
    
    console.log(`📞 Extracted - Phone: ${phone}`);
    
    return {
      phone: phone,
    };
  } catch (error) {
    console.error('❌ Error extracting phone details:', error);
    return null;
  }
}

// Helper function to send WhatsApp message
async function sendWhatsAppMessage(phoneNumber, templateName, templateContent, storeData) {
  try {
    const messagePayload = {
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
              id: templateContent.checkout_url || "https://example.com/checkout"
            }
          ]
        }
      },
      reply_to: null,
      myop_ref_id: "checkout_reminder_123"
    };
    
    console.log('📤 Sending checkout reminder:', JSON.stringify(messagePayload, null, 2));
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASEURL}/chat/messages`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${storeData.whatsapp_api_key}`,
        'X-MYOP-COMPANY-ID': `${storeData.company_id}`
      },
      body: JSON.stringify(messagePayload)
    });
    
    const result = await response.json();
    console.log('✅ Checkout reminder sent successfully:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Error sending checkout reminder:', error);
    throw error;
  }
}

// Helper to map values from checkout data to dynamic data
function getMappedValue(mappingField, data) {
  switch (mappingField) {
    case 'Name':
      return data.customer_first_name || 'Customer';
    case 'Order id':
      return String(data?.id || data?.token || '123456');
    case 'Phone number':
      return data.customer_phone || '0000000000';
    case 'Quantity':
      if (Array.isArray(data.line_items)) {
        const totalQuantity = data.line_items.reduce((sum, item) => {
          return sum + (item.quantity || 0);
        }, 0);
        return String(totalQuantity);
      }
      return '0';
    case 'Total price':
      return data?.total_price || '00';
    default:
      return '';
  }
}

// Function to build WhatsApp template content
function buildTemplateContent(templateRows, data) {
  const templateContent = {
    header: null,
    body: null,
    footer: null,
    buttons: [],
    checkout_url: data.checkout_url || data.abandoned_checkout_url
  };

  const bodyExample = {};

  for (const row of templateRows) {
    const value = JSON.parse(row.value || '{}');

    switch (row.component_type) {
      case "HEADER":
        templateContent.header = value;
        break;

      case "BODY":
        templateContent.body = value;
        if (row.mapping_field && row.variable_name) {
          bodyExample[row.variable_name] = getMappedValue(row.mapping_field, data);
        }
        break;

      case "FOOTER":
        templateContent.footer = value;
        break;

      case "BUTTONS":
      case "BUTTONS_COMPONENT":
        const buttons = value.buttons || [value];
        buttons.forEach((btn) => {
          if (btn && Object.keys(btn).length > 0) {
            templateContent.buttons.push(btn);
          }
        });
        break;

      default:
        break;
    }
  }

  if (templateContent.body) {
    templateContent.body.example = bodyExample;
  }

  return templateContent;
}

// Function to schedule reminder messages
async function scheduleReminderMessages(checkoutData, storeData, storePhoneNumber) {
  let connection;
  
  try {
    connection = await getDbConnection();
    
    const reminderEvents = ["Reminder 1", "Reminder 2", "Reminder 3"];
    
    for (const eventTitle of reminderEvents) {
      console.log(`🔍 Setting up reminder for event: ${eventTitle}`);
      
      // Get event configuration including delay
      const [categoryRows] = await connection.execute(
        'SELECT template_id, template_data_id, status, delay_minutes FROM category_event WHERE title = ? AND phonenumber = ? LIMIT 1',
        [eventTitle, storePhoneNumber]
      );

      if (categoryRows.length === 0) {
        console.log(`⚠️ No configuration found for event: ${eventTitle}`);
        continue;
      }

      const { template_id, template_data_id, status, delay_minutes } = categoryRows[0];
      
      if (status != 1) {
        console.log(`⚠️ Event "${eventTitle}" is disabled`);
        continue;
      }

      // Get template name
      const [templateRows] = await connection.execute(
        'SELECT template_name FROM template WHERE template_id = ? AND phonenumber = ? LIMIT 1',
        [template_id, storePhoneNumber]
      );

      if (templateRows.length === 0) {
        console.log(`⚠️ No template found for template_id: ${template_id}`);
        continue;
      }

      const templateName = templateRows[0].template_name;
      
      // Get template variables
      const [templateVariableRows] = await connection.execute(
        'SELECT * FROM template_variable WHERE template_data_id = ? ORDER BY template_variable_id',
        [template_data_id]
      );

      if (templateVariableRows.length === 0) {
        console.log(`⚠️ No template variables found for: ${templateName}`);
        continue;
      }

      // Calculate delay time
      const delayMinutes = delay_minutes || 60; // Default 1 hour if not set
      const checkoutTime = new Date(checkoutData.created_at || checkoutData.timestamp || Date.now());
      const reminderTime = new Date(checkoutTime.getTime() + (delayMinutes * 60 * 1000));
      
      console.log(`⏰ Scheduling "${eventTitle}" for ${reminderTime.toISOString()} (delay: ${delayMinutes} minutes)`);
      
      // Create unique reminder ID
      const reminderId = `${checkoutData.token || checkoutData.id}_${eventTitle.replace(/\s+/g, '_')}`;
      
      // Check if this reminder is already scheduled
      if (scheduledReminders.has(reminderId)) {
        console.log(`⚠️ Reminder ${reminderId} already scheduled, skipping`);
        continue;
      }
      
      // Schedule the reminder
      const now = new Date();
      if (reminderTime <= now) {
        console.log(`⚠️ Reminder time ${reminderTime.toISOString()} is in the past, scheduling for immediate execution`);
        // Execute immediately if time has passed
        setTimeout(() => {
          executeReminder(checkoutData, templateName, templateVariableRows, storeData, reminderId);
        }, 1000);
      } else {
        // Schedule for future execution
        const timeoutMs = reminderTime.getTime() - now.getTime();
        const timeoutId = setTimeout(() => {
          executeReminder(checkoutData, templateName, templateVariableRows, storeData, reminderId);
        }, timeoutMs);
        
        // Store the scheduled reminder
        scheduledReminders.set(reminderId, {
          timeoutId,
          checkoutData,
          templateName,
          eventTitle,
          scheduledFor: reminderTime,
          storeData
        });
        
        console.log(`✅ Reminder "${eventTitle}" scheduled successfully for ${reminderTime.toISOString()}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error scheduling reminders:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Function to execute a reminder
async function executeReminder(checkoutData, templateName, templateVariableRows, storeData, reminderId) {
  try {
    console.log(`🔔 Executing reminder: ${reminderId}`);
    
    // Extract phone details
    const phoneDetails = extractPhoneDetails(checkoutData);
    if (!phoneDetails) {
      console.warn('⚠️ No phone number available for reminder');
      return;
    }
    
    // Build template content
    const templateContent = buildTemplateContent(templateVariableRows, checkoutData);
    
    if (!templateContent) {
      console.warn('⚠️ Failed to build template content for reminder');
      return;
    }
    
    // Send WhatsApp message
    await sendWhatsAppMessage(
      phoneDetails.phone,
      templateName,
      templateContent,
      storeData
    );
    
    console.log(`✅ Reminder executed successfully: ${reminderId}`);
    
    // Remove from scheduled reminders
    scheduledReminders.delete(reminderId);
    
  } catch (error) {
    console.error(`❌ Error executing reminder ${reminderId}:`, error);
    // Remove failed reminder from schedule
    scheduledReminders.delete(reminderId);
  }
}

// ✅ Handle POST (receive checkout creation and schedule reminders)
export async function POST(req) {
  let connection;

  try {
    const topic = req.headers.get("x-shopify-topic");
    const shopDomain = req.headers.get("x-shop");
    const data = await req.json();

    console.log(`🛒 Checkout received [${topic}] from shop ${shopDomain}:`, JSON.stringify(data, null, 2));

    // Only process checkout creation events
    if (topic !== "checkouts/create") {
      return NextResponse.json({
        status: "ignored",
        message: `Event ${topic} not handled by checkout reminder route`
      });
    }

    // Get database connection
    connection = await getDbConnection();

    // 1. Fetch store data from stores table
    const [storeRows] = await connection.execute(
      'SELECT * FROM stores WHERE shop = ?',
      [shopDomain]
    );

    if (storeRows.length === 0) {
      throw new Error(`Store not found: ${shopDomain}`);
    }

    const storeData = storeRows[0];
    console.log('🏪 Store data fetched:', storeData);

    // 2. Get store phone number
    const [storePhoneRows] = await connection.execute(
      'SELECT phonenumber FROM stores WHERE shop = ? LIMIT 1',
      [shopDomain]
    );

    if (storePhoneRows.length === 0) {
      throw new Error("No store found");
    }

    const storePhoneNumber = storePhoneRows[0].phonenumber;
    console.log("📞 Store phone number:", storePhoneNumber);

    // 3. Save checkout to database with current timestamp
    const currentTimestamp = new Date().toISOString();
    
    try {
      await connection.execute(
        `INSERT INTO checkouts (
          checkout_token, 
          shop_url, 
          customer_phone, 
          customer_first_name, 
          customer_email,
          total_price,
          checkout_url,
          created_at,
          updated_at,
          checkout_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.token || data.id,
          shopDomain,
          data.customer?.phone || data.billing_address?.phone || null,
          data.customer?.first_name || data.billing_address?.first_name || null,
          data.customer?.email || data.email || null,
          data.total_price || '0.00',
          data.abandoned_checkout_url || data.checkout_url || null,
          currentTimestamp,
          currentTimestamp,
          JSON.stringify(data)
        ]
      );
      
      console.log('✅ Checkout saved to database');
    } catch (dbError) {
      console.error('⚠️ Error saving to database (continuing anyway):', dbError.message);
    }

    // 4. Schedule reminder messages
    const enrichedCheckoutData = {
      ...data,
      timestamp: currentTimestamp,
      shop_url: shopDomain
    };

    await scheduleReminderMessages(enrichedCheckoutData, storeData, storePhoneNumber);

    return NextResponse.json({
      status: "success",
      message: "Checkout received and reminders scheduled",
      checkout: {
        token: data.token || data.id,
        shop: shopDomain,
        scheduledReminders: Array.from(scheduledReminders.keys()).filter(key => 
          key.startsWith(`${data.token || data.id}_`)
        )
      }
    });

  } catch (err) {
    console.error("❌ Error processing checkout:", err);
    return NextResponse.json(
      { 
        status: "error", 
        message: err.message,
        checkout: req.body || null
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// ✅ Handle GET (return scheduled reminders and process pending ones)
export async function GET(req) {
  let connection;
  
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    if (action === 'process-pending') {
      // Process pending reminders from database
      return await processPendingReminders();
    }
    
    // Return current scheduled reminders
    const remindersList = Array.from(scheduledReminders.entries()).map(([id, data]) => ({
      id,
      eventTitle: data.eventTitle,
      templateName: data.templateName,
      scheduledFor: data.scheduledFor,
      checkoutToken: data.checkoutData.token || data.checkoutData.id,
      shop: data.checkoutData.shop_url
    }));
    
    return NextResponse.json({
      status: "success",
      scheduledReminders: remindersList,
      total: remindersList.length
    });
    
  } catch (error) {
    console.error("❌ Error in GET handler:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Function to process pending reminders from database (for cron jobs)
async function processPendingReminders() {
  let connection;
  
  try {
    connection = await getDbConnection();
    
    // Get all checkouts that need reminders
    const [checkoutRows] = await connection.execute(`
      SELECT 
        c.checkout_token,
        c.shop_url,
        c.customer_phone,
        c.customer_first_name,
        c.customer_email,
        c.total_price,
        c.checkout_url,
        c.created_at,
        c.checkout_data,
        s.phonenumber as store_phone
      FROM checkouts c
      JOIN stores s ON c.shop_url = s.shop
      WHERE c.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND c.customer_phone IS NOT NULL
    `);
    
    console.log(`🔍 Found ${checkoutRows.length} checkouts to process for reminders`);
    
    const processedReminders = [];
    
    for (const checkout of checkoutRows) {
      try {
        const checkoutTime = new Date(checkout.created_at);
        const now = new Date();
        const timeDiffMinutes = Math.floor((now - checkoutTime) / (1000 * 60));
        
        console.log(`⏰ Checkout ${checkout.checkout_token}: ${timeDiffMinutes} minutes old`);
        
        // Get store data
        const [storeRows] = await connection.execute(
          'SELECT * FROM stores WHERE phonenumber = ?',
          [checkout.store_phone]
        );
        
        if (storeRows.length === 0) continue;
        const storeData = storeRows[0];
        
        // Check each reminder event
        const reminderEvents = ["Reminder 1", "Reminder 2", "Reminder 3"];
        
        for (const eventTitle of reminderEvents) {
          // Get event configuration
          const [eventRows] = await connection.execute(
            'SELECT template_id, template_data_id, status, delay_minutes FROM category_event WHERE title = ? AND phonenumber = ? LIMIT 1',
            [eventTitle, checkout.store_phone]
          );
          
          if (eventRows.length === 0 || eventRows[0].status != 1) continue;
          
          const delayMinutes = eventRows[0].delay_minutes || 60;
          
          // Check if it's time to send this reminder
          if (timeDiffMinutes >= delayMinutes) {
            const reminderKey = `${checkout.checkout_token}_${eventTitle}_sent`;
            
            // Check if already sent (you might want to track this in database)
            const [sentRows] = await connection.execute(
              'SELECT id FROM sent_reminders WHERE checkout_token = ? AND event_title = ?',
              [checkout.checkout_token, eventTitle]
            );
            
            if (sentRows.length > 0) {
              console.log(`⚠️ Reminder already sent: ${reminderKey}`);
              continue;
            }
            
            // Get template details
            const [templateRows] = await connection.execute(
              'SELECT template_name FROM template WHERE template_id = ? AND phonenumber = ? LIMIT 1',
              [eventRows[0].template_id, checkout.store_phone]
            );
            
            if (templateRows.length === 0) continue;
            
            const templateName = templateRows[0].template_name;
            
            // Get template variables
            const [templateVariableRows] = await connection.execute(
              'SELECT * FROM template_variable WHERE template_data_id = ? ORDER BY template_variable_id',
              [eventRows[0].template_data_id]
            );
            
            if (templateVariableRows.length === 0) continue;
            
            // Prepare checkout data
            const checkoutData = {
              ...JSON.parse(checkout.checkout_data || '{}'),
              token: checkout.checkout_token,
              shop_url: checkout.shop_url,
              customer_phone: checkout.customer_phone,
              customer_first_name: checkout.customer_first_name,
              checkout_url: checkout.checkout_url,
              created_at: checkout.created_at
            };
            
            // Send reminder
            try {
              const phoneDetails = extractPhoneDetails(checkoutData);
              if (!phoneDetails) continue;
              
              const templateContent = buildTemplateContent(templateVariableRows, checkoutData);
              if (!templateContent) continue;
              
              await sendWhatsAppMessage(
                phoneDetails.phone,
                templateName,
                templateContent,
                storeData
              );
              
              // Mark as sent in memory
              sentReminders.add(reminderKey);
              
              processedReminders.push({
                checkoutToken: checkout.checkout_token,
                eventTitle,
                templateName,
                status: 'sent'
              });
              
              console.log(`✅ Reminder sent: ${eventTitle} for checkout ${checkout.checkout_token}`);
              
            } catch (sendError) {
              console.error(`❌ Failed to send reminder for ${checkout.checkout_token}:`, sendError);
              processedReminders.push({
                checkoutToken: checkout.checkout_token,
                eventTitle,
                templateName,
                status: 'failed',
                error: sendError.message
              });
            }
          } else {
            const timeLeft = delayMinutes - timeDiffMinutes;
            console.log(`⏳ Reminder "${eventTitle}" for ${checkout.checkout_token} scheduled in ${timeLeft} minutes`);
          }
        }
        
      } catch (checkoutError) {
        console.error(`❌ Error processing checkout ${checkout.checkout_token}:`, checkoutError);
      }
    }
    
    return NextResponse.json({
      status: "success",
      message: `Processed ${checkoutRows.length} checkouts`,
      processedReminders,
      totalProcessed: processedReminders.length
    });
    
  } catch (error) {
    console.error('❌ Error processing pending reminders:', error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// ✅ Handle DELETE (cancel scheduled reminder)
export async function DELETE(req) {
  try {
    const url = new URL(req.url);
    const reminderId = url.searchParams.get('id');
    
    if (!reminderId) {
      return NextResponse.json(
        { status: "error", message: "Reminder ID required" },
        { status: 400 }
      );
    }
    
    const reminder = scheduledReminders.get(reminderId);
    if (reminder) {
      clearTimeout(reminder.timeoutId);
      scheduledReminders.delete(reminderId);
      
      console.log(`🗑️ Cancelled reminder: ${reminderId}`);
      
      return NextResponse.json({
        status: "success",
        message: `Reminder ${reminderId} cancelled`
      });
    } else {
      return NextResponse.json(
        { status: "error", message: "Reminder not found" },
        { status: 404 }
      );
    }
    
  } catch (error) {
    console.error("❌ Error cancelling reminder:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}

// Initialize cron job to process pending reminders every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('🕒 Cron job: Processing pending reminders...');
  try {
    await processPendingReminders();
    console.log('✅ Cron job completed successfully');
  } catch (error) {
    console.error('❌ Cron job failed:', error);
  }
});

console.log('⚡ Checkout reminder service initialized with cron job');