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
    const customer = orderData.customer;
    
    if (!customer || !customer.phone) {
      console.warn('⚠️ No phone number found in customer data');
      return null;
    }
    
    let phone = customer.phone;
    
    // Clean phone number (remove spaces, dashes, etc.)
    phone = phone.replace(/[\s\-\(\)]/g, '');

    phone = phone.slice(-10);
    
    
    
    console.log(`📞 Extracted - Phone: ${phone}, Country Code: ${countryCode}`);
    
    return {
      phone: phone,
      countryCode: countryCode
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
async function sendWhatsAppMessage(phoneNumber, countryCode, templateName, templateContent, storeData) {
  try {
    const messagePayload = {
      phone_number_id: storeData.phone_number_id,
      customer_country_code: '91',
      customer_number: phoneNumber,
      data: {
        type: "template",
        language: "en",
        context: {
          template_name: templateName,
          language: "en",
          body: templateContent.body || {},
          buttons: templateContent.buttons || [],
          header: templateContent.header || null,
          footer: templateContent.footer || null
        }
      },
      reply_to: null
    };
    
    console.log('📤 Sending message payload:', JSON.stringify(messagePayload, null, 2));
    
    // Make API call to send message
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
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
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
    const shopDomain = req.headers.get("x-shopify-shop-domain");
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
    
    // 3. Fetch template data from template_variable table
    const templateDataId = 129; // You can make this dynamic based on order type or other criteria
    const [templateRows] = await connection.execute(
      'SELECT * FROM template_variable WHERE template_data_id = ? ORDER BY template_variable_id',
      [templateDataId]
    );
    
    if (templateRows.length === 0) {
      throw new Error(`No template data found for template_data_id: ${templateDataId}`);
    }
    
    console.log(`📄 Template data fetched: ${templateRows.length} rows`);
    
    // 4. Find template name from the template rows
    const templateName = 'abandoned_cart'; // This should be dynamic based on your template data
    
    // 5. Build template content
    const customerName = data.customer?.first_name || data.billing_address?.first_name || 'Customer';
    const templateContent = buildTemplateContent(templateRows, data, customerName);
    
    if (!templateContent) {
      throw new Error('Failed to build template content');
    }
    
    console.log('📝 Template content built:', JSON.stringify(templateContent, null, 2));
    
    // 6. Send WhatsApp message
    try {
      const messageResult = await sendWhatsAppMessage(
        phoneDetails.phone,
        phoneDetails.countryCode,
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

// ✅ Handle GET with specific order lookup (optional)
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('order_id');
    
    if (orderId) {
      const order = orders.find(o => o.data.id == orderId);
      if (order) {
        return NextResponse.json({ status: "success", order });
      } else {
        return NextResponse.json({ status: "error", message: "Order not found" }, { status: 404 });
      }
    }
    
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
