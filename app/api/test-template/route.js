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
         "buttons": [
        {
          "index": 0,
          "id": "https://flask-01.myshopify.com/95355666717/checkouts/ac/hWN2TB7ZmvSu4DM4b8U70bgH/recover?key=65ed255c5950eaeb927a13420bb84879&locale=en-IN"
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

// ✅ Function to build WhatsApp template content using fallback values
function buildTemplateContentWithFallbacks(templateRows) {
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
      case "HEADER":
        templateContent.header = value;
        break;

      case "BODY":
        templateContent.body = value;

        // Use fallback_value instead of extracted data
        if (row.variable_name && row.fallback_value) {
          bodyExample[row.variable_name] = row.fallback_value;
        }
        break;

      case "FOOTER":
        templateContent.footer = value;
        break;

      case "BUTTONS":
      case "BUTTONS_COMPONENT":
        const buttons = value.buttons || [value];

        // Only push non-null & non-empty objects
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

// ✅ Handle POST (receive category_event_id and phonenumber, send message with fallback values)
export async function POST(req) {
  let connection;

  try {
    const requestData = await req.json();
    const { category_event_id, phonenumber } = requestData;

    console.log(`📦 Request received with category_event_id: ${category_event_id}, phonenumber: ${phonenumber}`);

    if (!category_event_id || !phonenumber) {
      throw new Error('Missing required parameters: category_event_id and phonenumber');
    }

    // Get database connection
    connection = await getDbConnection();

    // 1. Fetch category_event data using category_event_id
    const [categoryRows] = await connection.execute(
      'SELECT template_id, template_data_id, title, store_id FROM category_event WHERE category_event_id = ? LIMIT 1',
      [category_event_id]
    );

    if (categoryRows.length === 0) {
      throw new Error(`No category_event found with id: ${category_event_id}`);
    }

    const { template_id, template_data_id, title, store_id } = categoryRows[0];
    console.log(`🧩 Category Event found: ${title}, template_id: ${template_id}, template_data_id: ${template_data_id}, store_id: ${store_id}`);

    // 2. Fetch store data using store_id
    const [storeRows] = await connection.execute(
      'SELECT * FROM stores WHERE id = ?',
      [store_id]
    );

    if (storeRows.length === 0) {
      throw new Error(`Store not found with id: ${store_id}`);
    }

    const storeData = storeRows[0];
    console.log('🏪 Store data fetched:', storeData.shop);

    // 3. Fetch template name using template_id
    const [templateRowsMeta] = await connection.execute(
      'SELECT template_name FROM template WHERE template_id = ? AND store_id = ? LIMIT 1',
      [template_id, store_id]
    );

    if (templateRowsMeta.length === 0) {
      throw new Error(`No template found for template_id: ${template_id} with store_id: ${store_id}`);
    }

    const templateName = templateRowsMeta[0].template_name;
    console.log(`📛 Template name found: ${templateName}`);

    // 4. Fetch template variables with fallback values
    const [templateRows] = await connection.execute(
      'SELECT * FROM template_variable WHERE template_data_id = ? ORDER BY template_variable_id',
      [template_data_id]
    );

    if (templateRows.length === 0) {
      throw new Error(`No template variables found for template_data_id: ${template_data_id}`);
    }

    console.log(`📄 Template data fetched (${templateName}): ${templateRows.length} rows`);
    console.log('📋 Template variables with fallback values:', templateRows.map(row => ({
      variable_name: row.variable_name,
      fallback_value: row.fallback_value,
      component_type: row.component_type
    })));

    // 5. Build template content using fallback values
    const templateContent = buildTemplateContentWithFallbacks(templateRows);

    if (!templateContent) {
      throw new Error(`Failed to build template content for: ${templateName}`);
    }

    console.log(`📝 Template content built with fallback values for "${templateName}":`, JSON.stringify(templateContent, null, 2));

    // 6. Send WhatsApp message
    try {
      const messageResult = await sendWhatsAppMessage(
        phonenumber,
        templateName,
        templateContent,
        storeData
      );

      console.log(`✅ WhatsApp message sent successfully for "${templateName}"`);
      
      return NextResponse.json({ 
        status: "success", 
        message: `WhatsApp message sent successfully using fallback values`,
        templateName: templateName,
        categoryEventTitle: title,
        sentTo: phonenumber,
        templateContent: templateContent,
        messageResult: messageResult
      });

    } catch (messageError) {
      console.error(`❌ Failed to send WhatsApp message for "${templateName}":`, messageError);
      throw new Error(`Failed to send WhatsApp message: ${messageError.message}`);
    }

  } catch (err) {
    console.error("❌ Error processing request:", err);
    return NextResponse.json(
      { 
        status: "error", 
        message: err.message
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