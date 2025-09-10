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
  storeData
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
          body: templateContent.body.example || {},
          buttons: templateContent.dynamicButtons || [], // Use dynamic buttons array
        },
      },
      // reply_to: null,
      // myop_ref_id: "csat_123"
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

export async function storePlacedOrder(data) {
  try {
    console.log("📦 Storing placed order...");
    console.log("➡️ Incoming data:", data);

    if (!data.id) {
      throw new Error("Order ID is required");
    }

    const paymentGateways = Array.isArray(data.payment_gateway_names)
      ? data.payment_gateway_names.join(", ")
      : data.payment_gateway_names || "";

    // get a connection for transaction
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1️⃣ Check if the order already exists
      const [existingRows] = await connection.execute(
        "SELECT id FROM placed_code_order WHERE order_id = ? ORDER BY id ASC LIMIT 1",
        [data.id]
      );

      if (existingRows.length > 0) {
        // 2️⃣ Update only the first matched row
        const rowId = existingRows[0].id;
        const [updateResult] = await connection.execute(
          `UPDATE placed_code_order
           SET order_status_url = ?, 
               payment_gateway_names = ?, 
               phone = ?, 
               order_number = ?, 
               updated_at = NOW()
           WHERE id = ?`,
          [
            data.order_status_url || "",
            paymentGateways,
            data.phone || "",
            data.order_number || "",
            rowId,
          ]
        );
        await connection.commit();
        console.log("✅ Order updated (first row only):", updateResult);
        return { success: true, action: "updated", result: updateResult };
      } else {
        // 3️⃣ Insert safely if no existing row
        const [insertResult] = await connection.execute(
          `INSERT INTO placed_code_order 
             (order_id, order_status_url, payment_gateway_names, phone, order_number, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            data.id,
            data.order_status_url || "",
            paymentGateways,
            data.phone || "",
            data.order_number || "",
          ]
        );
        await connection.commit();
        console.log("✅ Order inserted:", insertResult);
        return { success: true, action: "inserted", result: insertResult };
      }
    } catch (txError) {
      await connection.rollback();
      throw txError;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("❌ Query failed:", error.message);
    return { success: false, error: error.message };
  }
}

// ✅ Handle POST (receive new order and send message)
export async function POST(req) {
  let connection;

  const connect = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    charset: "utf8mb4",
    collation: "utf8mb4_unicode_ci",
  });

  try {
    const topic = req.headers.get("x-shopify-topic");
    const shopDomain = req.headers.get("x-shop");
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

    if (topic === "orders/updated") {
      // Check if fulfillments exist and the first fulfillment has delivered status
      if (
        Array.isArray(data.fulfillments) &&
        data.fulfillments.length > 0 &&
        data.fulfillments[0].shipment_status &&
        data.fulfillments[0].shipment_status.includes("delivered")
      ) {
        // Extract relevant data from the order
        const orderDeliveredData = {
          // Order basic info
          id: data.id,
          shop_url: shopDomain,
          customer_first_name: data.customer?.first_name,
          customer_last_name: data.customer?.last_name,
          customer_email: data.customer?.email,
          customer_phone: data.customer?.phone,

          // Order financial details
          currency: data.currency,
          subtotal_price: data.current_subtotal_price,
          total_price: data.current_total_price,
          total_tax: data.current_total_tax,

          // Shipping address
          shipping_first_name: data.shipping_address?.first_name,
          shipping_last_name: data.shipping_address?.last_name,
          shipping_address1: data.shipping_address?.address1,
          shipping_address2: data.shipping_address?.address2,
          shipping_city: data.shipping_address?.city,
          shipping_province: data.shipping_address?.province,
          shipping_country: data.shipping_address?.country,
          shipping_zip: data.shipping_address?.zip,
          shipping_phone: data.shipping_address?.phone,
          shipment_status: data.fulfillments[0].shipment_status,
          updated_at: updatedAt,
          created_at: createdAt,
          quantity: data.line_items.reduce((sum, item) => {
            return sum + (item.current_quantity || 0);
          }, 0),
        };

        await connect.execute(
          `
                INSERT INTO order_delivered (
                    id, shop_url, customer_first_name, customer_last_name, customer_email, customer_phone,
                    currency, subtotal_price, total_price, total_tax,  shipping_first_name, 
                    shipping_last_name, shipping_address1, shipping_address2,
                    shipping_city, shipping_province, shipping_country, shipping_zip, shipping_phone,
                    shipment_status, updated_at, created_at, quantity
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
          Object.values(orderDeliveredData)
        );

        // For demonstration, just log the data
        console.log("Order delivered data to insert:", orderDeliveredData);
        console.log(
          "Successfully processed delivered order:",
          data.order_number
        );
      }
    }

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
      throw new Error("Store not found with id ");
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
      return NextResponse.json({
        status: "success",
        order: data,
        message: "Order received but no phone number found",
      });
    }

    console.log("📞 Extracted phone details:", phoneDetails);

    // 🔍 3. Get event titles based on topic
    let eventTitles = [];

    switch (topic) {
      case "orders/create":
        if (
          Array.isArray(data.payment_gateway_names) &&
          data.payment_gateway_names.includes("Cash on Delivery (COD)")
        ) {
          eventTitles = ["Order Placed", "COD Order Confirmation or Cancel"];
          storePlacedOrder(data);
        } else {
          eventTitles = ["Order Placed"];
        }
        break;
      case "orders/paid":
        eventTitles = ["Payment Received"];
        break;
      case "orders/cancelled":
        if (
          Array.isArray(data.payment_gateway_names) &&
          data.payment_gateway_names.includes("Cash on Delivery (COD)")
        ) {
          eventTitles = [
            "Order Cancelled",
            "COD Order Cancellation Event Triggered",
          ];
        } else {
          eventTitles = ["Order Cancelled"];
        }
        break;
      case "orders/updated":
        if (
          Array.isArray(data.fulfillments) &&
          data.fulfillments?.[0].shipment_status.includes("delivered")
        ) {
          eventTitles = ["Order Delivered", "Order Shipped"];
        }
        break;
      case "orders/updated":
        if (data.fulfillment_status.includes("fulfilled")) {
          eventTitles = ["Order Out for Delivery"];
        }
        break;
      case "customers/create":
        eventTitles = ["Welcome Customer"];
        break;
      case "checkouts/create":
        eventTitles = ["Reminder 1"];
        break;
      case "orders/updated":
        if (data.financial_status === "refunded") {
          eventTitles = ["Refund Create"];
        }
        break;
      default:
        eventTitles = ["unknown event"];
    }

    console.log("Event titles:", eventTitles);

    // ✅ 1. Helper to map values from DB fields to dynamic data
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
              return sum + (item.current_quantity || 0);
            }, 0);
            return String(totalQuantity);
          }
          return "0";
        case "Total price":
          return data?.current_total_price || "00";
        default:
          return "";
      }
    }

    // Updated buildTemplateContent function to handle dynamic buttons
    function buildTemplateContent(templateRows, data) {
      const templateContent = {
        header: null,
        body: null,
        footer: null,
        buttons: [],
        dynamicButtons: [], // New array for dynamic buttons
      };

      const bodyExample = {};

      for (const row of templateRows) {
        const value = JSON.parse(row.value || "{}");

        switch (row.component_type) {
          case "HEADER":
            templateContent.header = value;
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
            const buttons = value.buttons || [value];

            // Process each button and add to both arrays
            buttons.forEach((btn, index) => {
              if (btn && Object.keys(btn).length > 0) {
                // Add format field if not present (default to STATIC for backward compatibility)
                if (!btn.format) {
                  btn.format =
                    btn.url && btn.url.includes("{{") ? "DYNAMIC" : "STATIC";
                }

                // Add to original buttons array
                templateContent.buttons.push(btn);

                // Create dynamic button object for the new format
                const dynamicButton = {
                  index: index,
                };

                // Add dynamic values if mapping_field exists for this button
                if (row.mapping_field && row.variable_name) {
                  dynamicButton[row.variable_name] = getMappedValue(
                    row.mapping_field,
                    data
                  );
                }

                // Add to dynamic buttons array
                templateContent.dynamicButtons.push(dynamicButton);
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

      console.log(
        "🔘 Dynamic buttons created:",
        JSON.stringify(templateContent.dynamicButtons, null, 2)
      );

      return templateContent;
    }

    // 🔍 3a. Get phone number and store_id from store
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

    // 🔍 3b. Process each event title and send messages for all matching templates
    const messageResults = [];
    const sentMessages = [];
    let hasAnyTemplate = false;

    for (const eventTitle of eventTitles) {
      console.log(`🔍 Trying to find template for event: ${eventTitle}`);

      try {
        // Fetch template_id and template_data_id from category_event using title + phone number + store_id
        const [categoryRows] = await connection.execute(
          "SELECT template_id, template_data_id, status FROM category_event WHERE title = ? AND phonenumber = ? AND store_id = ? LIMIT 1",
          [eventTitle, storePhoneNumber, storeId]
        );

        if (categoryRows.length === 0) {
          console.log(
            `⚠️ No template found for event: ${eventTitle} with store_id: ${storeId}`
          );
          continue;
        }

        const { template_id, template_data_id, status } = categoryRows[0];
        console.log(
          `🧩 Template IDs found for "${eventTitle}":`,
          template_id,
          template_data_id
        );

        // Fetch template name using template_id + phone number + store_id
        const [templateRowsMeta] = await connection.execute(
          "SELECT template_name FROM template WHERE template_id = ? AND phonenumber = ? AND store_id = ? LIMIT 1",
          [template_id, storePhoneNumber, storeId]
        );

        if (templateRowsMeta.length === 0) {
          console.log(
            `⚠️ No template name found for template_id: ${template_id} with store_id: ${storeId}`
          );
          continue;
        }

        const templateName = templateRowsMeta[0].template_name;
        console.log(`📛 Template name found: ${templateName}`);
        hasAnyTemplate = true;

        // Check if this template is enabled
        if (status != 1) {
          console.log(
            `⚠️ Template "${templateName}" is disabled (status: ${status})`
          );
          continue;
        }

        // 🔍 Fetch template variables (assuming template_variable table also has store_id)
        const [templateRows] = await connection.execute(
          "SELECT * FROM template_variable WHERE template_data_id = ? ORDER BY template_variable_id",
          [template_data_id]
        );

        if (templateRows.length === 0) {
          console.log(
            `⚠️ No template variables found for template_data_id: ${template_data_id} with store_id: ${storeId}`
          );
          continue;
        }

        console.log(
          `📄 Template data fetched (${templateName}): ${templateRows.length} rows`
        );

        // ✅ Build template content with mapped data
        const templateContent = buildTemplateContent(templateRows, data);

        if (!templateContent) {
          console.log(
            `⚠️ Failed to build template content for: ${templateName}`
          );
          continue;
        }

        console.log(
          `📝 Template content built for "${templateName}":`,
          JSON.stringify(templateContent, null, 2)
        );

        // ✅ Send WhatsApp message
        try {
          const messageResult = await sendWhatsAppMessage(
            phoneDetails.phone,
            templateName,
            templateContent,
            storeData
          );

          console.log(
            `✅ WhatsApp message sent successfully for "${templateName}"`
          );
          messageResults.push({
            eventTitle,
            templateName,
            status: "success",
            result: messageResult,
          });
          sentMessages.push(templateName);
        } catch (messageError) {
          console.error(
            `❌ Failed to send WhatsApp message for "${templateName}":`,
            messageError
          );
          messageResults.push({
            eventTitle,
            templateName,
            status: "error",
            error: messageError.message,
          });
        }
      } catch (templateError) {
        console.error(
          `❌ Error processing template for "${eventTitle}":`,
          templateError
        );
        messageResults.push({
          eventTitle,
          templateName: null,
          status: "error",
          error: templateError.message,
        });
      }
    }

    if (!hasAnyTemplate) {
      throw new Error(
        `No templates found for any of the event titles: ${eventTitles.join(
          ", "
        )} with phone: ${storePhoneNumber}`
      );
    }

    // ✅ Return response based on results
    const successCount = messageResults.filter(
      (r) => r.status === "success"
    ).length;
    const totalAttempts = messageResults.length;

    if (successCount === 0) {
      return NextResponse.json({
        status: "partial_success",
        order: data,
        message: "Order received but failed to send any WhatsApp messages",
        messageResults: messageResults,
      });
    } else if (successCount === totalAttempts) {
      return NextResponse.json({
        status: "success",
        order: data,
        message: `Order received and ${successCount} WhatsApp message(s) sent successfully`,
        sentTemplates: sentMessages,
        messageResults: messageResults,
      });
    } else {
      return NextResponse.json({
        status: "partial_success",
        order: data,
        message: `Order received. ${successCount} of ${totalAttempts} messages sent successfully`,
        sentTemplates: sentMessages,
        messageResults: messageResults,
      });
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
    return NextResponse.json({
      status: "success",
      orders: orders,
      total: orders.length,
    });
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}
