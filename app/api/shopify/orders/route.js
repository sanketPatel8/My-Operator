// import { NextResponse } from "next/server";


// // Inside your POST handler:



// // ✅ In-memory orders store
// let orders = [];

// // ✅ Handle POST (receive new order)
// export async function POST(req) {
//   try {
    
//     const topic = req.headers.get("x-shopify-topic");
//     const shop = req.headers.get("x-shop");
//     const data = await req.json();

//     console.log(`📦 Order received [${topic}] from shop ${shop}:`, data);

//     // Store order in memory
//     orders.unshift({ topic, shop, data, receivedAt: new Date().toISOString() });
    

//     // Optional: limit to last 50 orders to avoid memory overflow
//     if (orders.length > 50) orders.pop();

//     return NextResponse.json({ status: "success", order: data });
//   } catch (err) {
//     console.error("❌ Error receiving order:", err);
//     return NextResponse.json(
//       { status: "error", message: err.message },
//       { status: 500 }
//     );
//   }
// }

// // ✅ Handle GET (return stored orders)
// export async function GET() {
//   return NextResponse.json({ status: "success", orders });
// }

import { NextResponse } from "next/server";
import mysql from 'mysql2/promise';

// Database connection configuration
const dbConfig = {
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME
};


// ✅ In-memory orders store
let orders = [];

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

// Helper function to extract phone number and country code from order data
function extractPhoneDetails(orderData) {
  try {
    const customer = orderData;
    
    if (!customer || !customer.phone) {
      console.warn('⚠️ No phone number found in customer data');
      return null;
    }
    
    let phone = customer.phone;
    
    phone = phone.slice(-10);
    
    
    
    console.log(`📞 Extracted - Phone: ${phone},`);
    
    return {
      phone: phone,
      
    };
  } catch (error) {
    console.error('❌ Error extracting phone details:', error);
    return null;
  }
}

// Helper function to build template content
function buildTemplateContent(templateData, orderData, customerName) {
  try {
    let content = {};
    
    console.log('🏗️ Building template content with data:', templateData.map(item => ({
      type: item.type,
      variable_name: item.variable_name,
      value: item.value ? 'HAS_VALUE' : 'NO_VALUE'
    })));
    
    templateData.forEach(item => {
      switch(item.type) {
        case 'HEADER_COMPONENT':
          if (item.value) {
            try {
              const headerData = JSON.parse(item.value);
              content.header = headerData;
            } catch (e) {
              console.warn('⚠️ Failed to parse header JSON:', item.value);
            }
          }
          break;
          
        case 'BODY_COMPONENT':
          if (item.value) {
            try {
              const bodyData = JSON.parse(item.value);
              // Replace placeholders with actual order data
              let bodyText = bodyData.text || '';
              bodyText = bodyText.replace(/\{name\}/g, customerName || 'Customer');
              bodyText = bodyText.replace(/\{order_id\}/g, orderData.id || 'N/A');
              bodyText = bodyText.replace(/\{total_price\}/g, orderData.total_price || '0');
              
              content.body = { ...bodyData, text: bodyText };
            } catch (e) {
              console.warn('⚠️ Failed to parse body JSON:', item.value);
            }
          }
          break;
          
        case 'BODY':
          // Handle simple body text
          if (item.variable_name === 'name') {
            content.body = content.body || { text: '' };
            content.body.text = content.body.text.replace(/\{name\}/g, customerName || 'Customer');
          }
          break;
          
        case 'BUTTONS_COMPONENT':
          if (item.value) {
            try {
              const buttonsData = JSON.parse(item.value);
              content.buttons = buttonsData.buttons || [];
            } catch (e) {
              console.warn('⚠️ Failed to parse buttons JSON:', item.value);
            }
          }
          break;
          
        case 'BUTTONS':
          // Handle individual button configurations
          if (item.variable_name && item.fallback_value) {
            content.buttons = content.buttons || [];
            content.buttons.push({
              type: "URL",
              text: item.variable_name,
              url: item.fallback_value
            });
          }
          break;
          
        case 'FOOTER_COMPONENT':
          if (item.value) {
            try {
              const footerData = JSON.parse(item.value);
              content.footer = footerData;
            } catch (e) {
              console.warn('⚠️ Failed to parse footer JSON:', item.value);
            }
          }
          break;
      }
    });
    
    console.log('📝 Built template content structure:', {
      hasHeader: !!content.header,
      hasBody: !!content.body,
      hasButtons: !!content.buttons,
      hasFooter: !!content.footer,
      buttonsCount: content.buttons ? content.buttons.length : 0
    });
    
    return content;
  } catch (error) {
    console.error('❌ Error building template content:', error);
    return null;
  }

}

// Helper function to send WhatsApp message
async function sendWhatsAppMessage(phoneNumber,  templateName, templateContent, storeData) {
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
         "buttons": [
        {
          "index": 0,
          "id": "flask-01.myshopify.com/95355666717/checkouts/ac/hWN2TB1ntajYFb8BrveVgSXp/recover?key=7a586990691c87d1dbe5eb89bc0bebd5&locale=en-IN"
        }
      ]

      }
      },
      reply_to: null,
      myop_ref_id: "csat_123"
    };
    
    console.log('📤 Sending message payload:', JSON.stringify(messagePayload, null, 2));
    
    // Make API call to send message.
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
    console.log('✅ Message sent successfully:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
    throw error;
  }
}
// ✅ Handle POST (receive new order and send message)
export async function POST(req) {
  let connection;

  try {
    const topic = req.headers.get("x-shopify-topic");
    const shopDomain = req.headers.get("x-shop");
    const data = await req.json();

    console.log(`📦 Order received [${topic}] from shop ${shopDomain}:`, JSON.stringify(data, null, 2));

    // Store order in memory
    const orderRecord = {
      topic,
      shop: shopDomain,
      data,
      receivedAt: new Date().toISOString()
    };

    orders.unshift(orderRecord);
    if (orders.length > 50) orders.pop();

    // Get database connection
    connection = await getDbConnection();

    // 1. Fetch store data from stores table (id = 11)
    const [storeRows] = await connection.execute(
      'SELECT * FROM stores WHERE id = ?',
      [11]
    );

    if (storeRows.length === 0) {
      throw new Error('Store not found with id 11');
    }

    const storeData = storeRows[0];
    console.log('🏪 Store data fetched:', storeData);

    // 2. Extract phone details from order
    console.log('🔍 Customer data from order:', JSON.stringify(data.customer, null, 2));
    const phoneDetails = extractPhoneDetails(data);
    if (!phoneDetails) {
      console.warn('⚠️ Skipping message send - no phone number found');
      return NextResponse.json({ 
        status: "success", 
        order: data,
        message: "Order received but no phone number found"
      });
    }

    console.log('📞 Extracted phone details:', phoneDetails);
      // 🔍 3. Get event title based on topic
      let eventTitle;

      switch (topic) {
        case "orders/create":
          eventTitle = "order placed";
          break;
        case "orders/paid":
          eventTitle = "Payment Received";
          break;
        case "orders/cancelled":
          eventTitle = "Order Cancelled";
          break;
        case "orders/fulfilled":
          eventTitle = "Order Shipped";
          break;
        case "customers/create":
          eventTitle = "Welcome Customer";
          break;
        case "checkouts/create":
          eventTitle = "Reminder 1";
          break;
        default:
          eventTitle = "unknown event";
      }

      console.log("Event title:", eventTitle);

      // ✅ 1. Helper to map values from DB fields to dynamic data
        function getMappedValue(mappingField, data) {
          switch (mappingField) {
            case 'Name':
              return data.customer?.first_name || 'Customer';
            case 'Order id':
              return String(data?.id || '123456');
            case 'Phone number':
              return data.customer?.phone || '0000000000';
            case 'Quantity':
              if (Array.isArray(data.line_items)) {
                const totalQuantity = data.line_items.reduce((sum, item) => {
                  return sum + (item.current_quantity || 0);
                }, 0);
                return String(totalQuantity);
              }
              return '0';

            case 'Total price':
              return data?.current_total_price || '00';
            default:
              return '';
          }
        }

        // ✅ 2. Function to build WhatsApp template content
        function buildTemplateContent(templateRows, data) {
          const templateContent = {
            header: null,
            body: null,
            footer: null,
            buttons: [],
          };

          const bodyExample = {};

          for (const row of templateRows) {
            const value = JSON.parse(row.value || '{}');

            switch (row.component_type) {
              case 'HEADER':
                templateContent.header = value;
                break;

              case 'BODY':
                templateContent.body = value;

                // Inject dynamic values using mapping_field
                if (row.mapping_field && row.variable_name) {
                  bodyExample[row.variable_name] = getMappedValue(row.mapping_field, data);
                }
                break;

              case 'FOOTER':
                templateContent.footer = value;
                break;

              case 'BUTTONS':
              case 'BUTTONS_COMPONENT':
                if (value.buttons) {
                  templateContent.buttons.push(...value.buttons);
                } else {
                  templateContent.buttons.push(value);
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

        // 🔍 3a. Get phone number from store (store ID = 11)
        const [storePhoneRows] = await connection.execute(
          'SELECT phonenumber FROM stores WHERE id = ? LIMIT 1',
          [11]
        );

        if (storePhoneRows.length === 0) {
          throw new Error("No store found with id 11");
        }

        const storePhoneNumber = storePhoneRows[0].phonenumber;
        console.log("📞 Store phone number:", storePhoneNumber);

        // 🔍 3b. Fetch template_id and template_data_id from category_event using title + phone number
        const [categoryRows] = await connection.execute(
          'SELECT template_id, template_data_id, status FROM category_event WHERE title = ? AND phonenumber = ? LIMIT 1',
          [eventTitle, storePhoneNumber]
        );

        if (categoryRows.length === 0) {
          throw new Error(`No category_event mapping found for title: ${eventTitle} and phone: ${storePhoneNumber}`);
        }

        const { template_id, template_data_id, status } = categoryRows[0];
        console.log("🧩 Template IDs:", template_id, template_data_id);

        // 🔍 3c. Fetch template name using template_id + phone number
        const [templateRowsMeta] = await connection.execute(
          'SELECT template_name FROM template WHERE template_id = ? AND phonenumber = ? LIMIT 1',
          [template_id, storePhoneNumber]
        );

        if (templateRowsMeta.length === 0) {
          throw new Error(`No template found with template_id: ${template_id} and phone: ${storePhoneNumber}`);
        }

        const templateName = templateRowsMeta[0].template_name;
        console.log("📛 Template name:", templateName);

        // 🔍 3d. Fetch template variables
        const [templateRows] = await connection.execute(
          'SELECT * FROM template_variable WHERE template_data_id = ? ORDER BY template_variable_id',
          [template_data_id]
        );

        if (templateRows.length === 0) {
          throw new Error(`No template variables found for template_data_id: ${template_data_id}`);
        }

        console.log(`📄 Template data fetched (${templateName}): ${templateRows.length} rows`);

        // ✅ 4. Build template content with mapped data
        const templateContent = buildTemplateContent(templateRows, data);

        if (!templateContent) {
          throw new Error('Failed to build template content');
        }

        console.log('📝 Template content built:', JSON.stringify(templateContent, null, 2));

        // ✅ 5. Send WhatsApp message
        try {
          if (status == 1) {
            const messageResult = await sendWhatsAppMessage(
              phoneDetails.phone,
              templateName,
              templateContent,
              storeData
            );

            console.log('✅ WhatsApp message sent successfully');

      return NextResponse.json({ 
        status: "success", 
        order: data,
        message: "Order received and WhatsApp message sent",
        messageResult: messageResult
      });
      } else {
        console.log("status is disable!:::::", status);
        
      }

    } catch (messageError) {
      console.error('❌ Failed to send WhatsApp message:', messageError);

      return NextResponse.json({ 
        status: "partial_success", 
        order: data,
        message: "Order received but failed to send WhatsApp message",
        error: messageError.message
      });
    }

  } catch (err) {
    console.error("❌ Error processing order:", err);
    return NextResponse.json(
      { 
        status: "error", 
        message: err.message,
        order: req.body || null
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
      total: orders.length
    });
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}
