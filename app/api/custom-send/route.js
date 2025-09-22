import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import pool from "@/lib/db";

// Database connection configuration
const dbConfig = {
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
};

// ✅ In-memory orders store
let orders = [];

// Helper function to create database connection
async function getDbConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    return connection;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    throw error;
  }
}

// Helper function to extract phone number and country code from order data
function extractPhoneDetails(orderData) {
  try {
    const customer = orderData;

    if (!customer || !customer.phone) {
      console.warn("⚠️ No phone number found in customer data");
      return null;
    }

    let phone = customer.phone;
    phone = phone.slice(-10);

    console.log(`📞 Extracted - Phone: ${phone},`);

    return {
      phone: phone,
    };
  } catch (error) {
    console.error("❌ Error extracting phone details:", error);
    return null;
  }
}

// Helper function to send WhatsApp message
async function sendWhatsAppMessage(
  phoneNumber,
  templateName,
  templateContent,
  storeData,
  trail
) {
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
          header: templateContent.header || {},
          body: templateContent.body.example || {},
          buttons: templateContent.buttons || [], // Use dynamic buttons array
        },
      },
      "reply_to": null,
      "trail": {
            "name": trail
        }
    };

    console.log(
      "📤 Sending message payload:",
      JSON.stringify(messagePayload, null, 2)
    );

    // Make API call to send message.
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASEURL}/chat/messages`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${storeData.whatsapp_api_key}`,
          "X-MYOP-COMPANY-ID": `${storeData.company_id}`,
        },
        body: JSON.stringify(messagePayload),
      }
    );

    const result = await response.json();
    console.log("✅ Message sent successfully:", result);
    return result;
  } catch (error) {
    console.error("❌ Error sending WhatsApp message:", error);
    throw error;
  }
}

// ✅ Handle POST (receive new order and send message)
export async function POST(req) {
  let connection;

  

  try {
    const topic = req.headers.get("x-shopify-topic");
    const shopDomain = req.headers.get("x-shopify-shop");
    const data = await req.json();

    console.log(
      `📦 Order received [${topic}] from shop ${shopDomain}:`,
      JSON.stringify(data, null, 2)
    );

    function getISTDateTime() {
      const now = new Date();
      const ist = new Date(
        now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
      );
      const year = ist.getFullYear();
      const month = String(ist.getMonth() + 1).padStart(2, "0");
      const day = String(ist.getDate()).padStart(2, "0");
      const hours = String(ist.getHours()).padStart(2, "0");
      const minutes = String(ist.getMinutes()).padStart(2, "0");
      const seconds = String(ist.getSeconds()).padStart(2, "0");
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    const createdAt = getISTDateTime();
    const updatedAt = getISTDateTime();

    // Store order in memory
    const orderRecord = {
      topic,
      shop: shopDomain,
      data,
      receivedAt: new Date().toISOString(),
    };

    orders.unshift(orderRecord);
    if (orders.length > 50) orders.pop();

    // Get database connection
    connection = await getDbConnection();

    // 1. Fetch store data from stores table
    const [storeRows] = await connection.execute(
      "SELECT * FROM stores WHERE shop = ?",
      [shopDomain]
    );

    if (storeRows.length === 0) {
      throw new Error("Store not found with shop ");
    }

    const storeData = storeRows[0];
    console.log("🏪 Store data fetched:", storeData);

    // 2. Extract phone details from order
    console.log(
      "🔍 Customer data from order:",
      JSON.stringify(data.customer, null, 2)
    );
    const phoneDetails = extractPhoneDetails(data);
    if (!phoneDetails) {
      console.warn("⚠️ Skipping message send - no phone number found");
      return NextResponse.json(
        {
          status: "success",
          order: data,
          message: "Order received but no phone number found",
        },
        { status: 200 }
      );
    }

    console.log("📞 Extracted phone details:", phoneDetails);

    // 🔍 3. Get phone number and store_id from store
    const [storePhoneRows] = await connection.execute(
      "SELECT phonenumber, id FROM stores WHERE shop = ? LIMIT 1",
      [shopDomain]
    );

    if (storePhoneRows.length === 0) {
      throw new Error("No store found with shop domain");
    }

    const { phonenumber: storePhoneNumber, id: storeId } = storePhoneRows[0];
    console.log("📞 Store phone number:", storePhoneNumber);
    console.log("🏪 Store ID:", storeId);

    // ✅ NEW: Dynamic event matching based on topic and event_trigger column
    console.log(`🔍 Looking for events matching topic: ${topic} for store_id: ${storeId}`);
    
    // Query to find matching events based on topic and store_id
    const [matchingEvents] = await connection.execute(
      `SELECT ce.*, t.template_name 
       FROM category_event ce
       LEFT JOIN template t ON ce.template_id = t.template_id 
       WHERE ce.event_trigger = ? AND ce.store_id = ? AND ce.phonenumber = ? AND ce.status = 1`,
      [topic, storeId, storePhoneNumber]
    );

    if (matchingEvents.length === 0) {
      console.log(`⚠️ No matching events found for topic: ${topic} with store_id: ${storeId}`);
      return NextResponse.json(
        {
          status: "success",
          order: data,
          message: `Order received but no matching event configuration found for topic: ${topic}`,
        },
        { status: 200 }
      );
    }

    console.log(`✅ Found ${matchingEvents.length} matching event(s):`, matchingEvents);

    // ✅ Helper to map values from DB fields to dynamic data
    function getMappedValue(mappingField, data) {
      switch (mappingField) {
        case "Name":
          return (
            data.billing_address?.first_name || data?.first_name || "Customer"
          );
        case "Order id":
          return String(data?.id || "123456");
        case "Phone number":
          return data.customer?.phone || "0000000000";
        case "Payment Url":
          return data.order_status_url || "no url";
        case "Quantity":
          if (Array.isArray(data.line_items)) {
            const totalQuantity = data.line_items.reduce((sum, item) => {
              const qty =
                item.current_quantity === 0
                  ? item.quantity
                  : item.current_quantity;
              return sum + qty;
            }, 0);
            return String(totalQuantity);
          }
          return "0";
        case "Total price":
          return data?.total_price || "00";
        default:
          return "Here";
      }
    }

    // Updated buildTemplateContent function to handle dynamic buttons
    function buildTemplateContent(templateRows, data, eventTitle) {
      const templateContent = {
        header: null,
        body: null,
        footer: null,
        buttons: [],
      };

      const bodyExample = {};

      console.log("Template rows:", templateRows);
      console.log("Order data:", data);

      for (const row of templateRows) {
        const value = JSON.parse(row.value || "{}");

        switch (row.component_type) {
          case "HEADER":
            templateContent.header = value;
            console.log("Header value:", value);
            const media = value.media_id;
            console.log("Media ID:", media);
            
            if (row.tamplate_image != null) {
              templateContent.header = { media_id: row.tamplate_image };
            } else {
              templateContent.header = { media_id: media };
            }
            break;

          case "BODY":
            templateContent.body = value;

            // Inject dynamic values using mapping_field
            if (row.mapping_field && row.variable_name) {
              bodyExample[row.variable_name] = getMappedValue(
                row.mapping_field,
                data
              );
            }
            break;

          case "FOOTER":
            templateContent.footer = value;
            break;

          case "BUTTONS":
          case "BUTTONS_COMPONENT":
            if (value.buttons && Array.isArray(value.buttons)) {
              if (templateContent.buttons.length === 0) {
                const output = value.buttons.map((button, index) => {
                   
                    //  button data
                    return {
                      index: index,
                      url: button.url || "#",
                    };
                  
                });

                console.log("✅ Processed buttons:", output);
                templateContent.buttons.push(...output);
              }
            } else {
              console.warn(
                "⚠️ value.buttons is not an array or doesn't exist:",
                value
              );
            }
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

    // ✅ Process each matching event and send messages
    const messageResults = [];
    const sentMessages = [];

    for (const event of matchingEvents) {
      console.log(`🔍 Processing event: ${event.title} (ID: ${event.category_event_id})`);

      try {
        const { template_id, template_data_id, template_variable_id, title: eventTitle, template_name } = event;
        
        console.log(`🧩 Processing event "${eventTitle}" with template_id: ${template_id}, template_data_id: ${template_data_id}`);

        // Fetch template variables
        const [templateRows] = await connection.execute(
          "SELECT * FROM template_variable WHERE template_data_id = ? ORDER BY template_variable_id",
          [template_data_id]
        );

        if (templateRows.length === 0) {
          console.log(`⚠️ No template variables found for template_data_id: ${template_data_id}`);
          continue;
        }

        console.log(`📄 Template data fetched (${template_name}): ${templateRows.length} rows`);

        // ✅ Build template content with mapped data
        const templateContent = buildTemplateContent(templateRows, data, eventTitle);

        if (!templateContent) {
          console.log(`⚠️ Failed to build template content for: ${template_name}`);
          continue;
        }

        // Generate trail based on topic
        let trail;
        if(topic == "Order Placed"){
          trail = "Shopify_order_placed";
        }else if(topic == "Order Cancelled"){
          trail = "Shopify_order_cancelled";
        }else if(topic == "Payment Received"){
          trail = "Shopify_order_payment";
        }else if(topic == "Order Shipped"){
          trail = "Shopify_order_shipped";
        }else if(topic == "Order Delivered"){
          trail = "Shopify_order_delivered";
        }else if(topic == "Order Out for Delivery"){
          trail = "Shopify_order_out_for_delivery";
        }else if(topic == "Refund Create"){
          trail = "Shopify_refund_created";
        }else if(topic == "COD Order Confirmation or Cancel"){
          trail = "Shopify_order_cod_confirmation";
        }else if(topic == "COD Order Cancellation Event Triggered"){
          trail = "Shopify_order_cod_cancelled";
        }else if(topic == "Welcome Customer"){
          trail = "Shopify_welcome_customer";
        }

        console.log(`📝 Template content built for "${template_name}":`, JSON.stringify(templateContent, null, 2));

        // ✅ Send WhatsApp message
        try {
          const messageResult = await sendWhatsAppMessage(
            phoneDetails.phone,
            template_name,
            templateContent,
            storeData,
            trail
          );

          console.log(`✅ WhatsApp message sent successfully for "${template_name}"`);
          messageResults.push({
            eventTitle,
            templateName: template_name,
            status: "success",
            result: messageResult,
          });
          sentMessages.push(template_name);
        } catch (messageError) {
          console.error(`❌ Failed to send WhatsApp message for "${template_name}":`, messageError);
          messageResults.push({
            eventTitle,
            templateName: template_name,
            status: "error",
            error: messageError.message,
          });
        }
      } catch (templateError) {
        console.error(`❌ Error processing template for "${event.title}":`, templateError);
        messageResults.push({
          eventTitle: event.title,
          templateName: event.template_name || null,
          status: "error",
          error: templateError.message,
        });
      }
    }

    // ✅ Return response based on results
    const successCount = messageResults.filter((r) => r.status === "success").length;
    const totalAttempts = messageResults.length;

    if (successCount === 0) {
      return NextResponse.json(
        {
          status: "partial_success",
          order: data,
          message: "Order received but failed to send any WhatsApp messages",
          messageResults: messageResults,
        },
        { status: 200 }
      );
    } else if (successCount === totalAttempts) {
      return NextResponse.json(
        {
          status: "success",
          order: data,
          message: `Order received and ${successCount} WhatsApp message(s) sent successfully`,
          sentTemplates: sentMessages,
          messageResults: messageResults,
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          status: "partial_success",
          order: data,
          message: `Order received. ${successCount} of ${totalAttempts} messages sent successfully`,
          sentTemplates: sentMessages,
          messageResults: messageResults,
        },
        { status: 200 }
      );
    }
  } catch (err) {
    console.error("❌ Error processing order:", err);
    return NextResponse.json(
      {
        status: "error",
        message: err.message,
        order: req.body || null,
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
    
  }
}

// ✅ Handle GET (return stored orders)
export async function GET() {
  try {
    return NextResponse.json(
      {
        status: "success",
        orders: orders,
        total: orders.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}