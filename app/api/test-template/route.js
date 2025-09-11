import { NextResponse } from "next/server";
import mysql from 'mysql2/promise';
import { validate } from "node-cron";

// Database connection configuration
const dbConfig = {
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME
};

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
async function sendWhatsAppMessage(phoneNumber, selectedTemplate, templateContent, storeData) {
  try {
    const messagePayload = {
      phone_number_id: storeData.phone_number_id,
      customer_country_code: "91",
      customer_number: phoneNumber,
      data: {
        type: "template",
        language: "en",
        context: {
          template_name: selectedTemplate,
          language: "en",
          body: templateContent.body.example || {},
          buttons:templateContent.buttons || []
        }
      },
      reply_to: null,
      myop_ref_id: "test_message_" + Date.now()
    };
    
    console.log('📤 Sending test message payload:', JSON.stringify(messagePayload, null, 2));
    
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
    console.log('✅ Test message sent successfully:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Error sending WhatsApp test message:', error);
    throw error;
  }
}

// ✅ Updated function to build template content with simplified button payload
function buildTemplateContentWithUserFallbacks(templateRows, userFallbackValues, data = {}) {
  const templateContent = {
    header: null,
    body: null,
    footer: null,
    buttons: [],
  };

  const bodyExample = {};

  console.log("user fallbacks", userFallbackValues);
  

  console.log(' Building template content with user-entered fallbacks:', templateRows);

  for (const row of templateRows) {
    const value = JSON.parse(row.value) || null;
    console.log("value", value);
    
    if(value!=null){

      console.log("start loop");
      
      console.log("Component type",row.component_type);
    switch (row.component_type) {
      case "HEADER":
        console.log("enter in header");
        
        templateContent.header = value;
        break;

      case "BODY":
        console.log("enter in body");
        
        templateContent.body = value;

        // ✅ USE USER-ENTERED FALLBACK VALUES instead of database values
        if (row.variable_name) {
          // Clean variable name (remove {{ }} if present)
          let cleanVariableName = row.variable_name.replace(/[{}]/g, '');

          // Try to find user-entered fallback value
          const userFallback = userFallbackValues[cleanVariableName] || 
                              userFallbackValues[row.variable_name];

          if (userFallback) {
            bodyExample[row.variable_name] = userFallback;
            console.log(`✅ Using user fallback for ${row.variable_name}: ${userFallback}`);
          } else {
            console.warn(`⚠️ No user fallback found for variable: ${row.variable_name}`);
            // Fallback to database value if no user value (shouldn't happen with frontend validation)
            bodyExample[row.variable_name] = row.fallback_value || `[${cleanVariableName}]`;
          }
        }
        break;

      case "FOOTER":
        templateContent.footer = value;
        break;

      case "BUTTONS":
      case "BUTTONS_COMPONENT":
        console.log("enter in buttons");
        
        // const buttons = value.buttons || [value];
        
        // buttons.forEach((btn, index) => {
        //   if (btn && Object.keys(btn).length > 0) {
        
        //     // ✅ SIMPLIFIED BUTTON PAYLOAD - Exact format requested
        //     if (btn.type === "URL") {

              
        //       const lastValue = Object.values(userFallbackValues).pop();
        //       const link = btn.url.replace(/\{\{.*?\}\}/g, data.order_status_url);
        //       const simplifiedButton = {
        //         index: index,
        //         "link": lastValue
        //       };
        //       templateContent.buttons.push(simplifiedButton);
        //       console.log(`✅ Simplified button payload:`, simplifiedButton);
        //     } 
        //   }
        // });

        if(value!=null){

        if (templateContent.buttons.length === 0) {

        // const values = Object.values(userFallbackValues).slice(-2);
        // const result = values.map((value, i) => ({ index: i, "link": value }));

        // console.log(result);
        // templateContent.buttons.push(...result);

        console.log("enter inside");
      
        const output = value.buttons.map(button => {
       // const key = Object.keys(button.url)[0];
        
        console.log("inside in inside");
        
        return {
          index: button.index,
          "url": button.url
        };
      });

      console.log("processed button",...output);
      templateContent.buttons.push(...output);
        }
      }
        break;

      default:
        break;
    }
  


  if (templateContent.body) {
    templateContent.body.example = bodyExample;
  }

  console.log('🏗️ Built template content:', JSON.stringify(templateContent, null, 2));
  return templateContent;
}
}
}

// ✅ Handle POST request with user-entered fallback values
export async function POST(req) {
  let connection;

  try {
    const requestData = await req.json();
    const { category_event_id, phonenumber, fallbackValues, variableSettings, selectedTemplate } = requestData;

    console.log(`📦 Test request received:`, {
      category_event_id,
      phonenumber,
      fallbackValues,
      totalVariables: Object.keys(fallbackValues || {}).length
    });

    // ✅ VALIDATE REQUIRED PARAMETERS
    if (!category_event_id || !phonenumber) {
      throw new Error('Missing required parameters: category_event_id and phonenumber');
    }

    if (!fallbackValues || Object.keys(fallbackValues).length === 0) {
      throw new Error('Missing fallback values. Please provide fallback values for all template variables.');
    }

    // Validate that all fallback values are non-empty
    const emptyFallbacks = Object.entries(fallbackValues).filter(([key, value]) => 
      !value || value.toString().trim() === ''
    );

    if (emptyFallbacks.length > 0) {
      throw new Error(`Empty fallback values found for: ${emptyFallbacks.map(([key]) => `{{${key}}}`).join(', ')}`);
    }

    // Get database connection
    connection = await getDbConnection();

   // ✅ Step 1: Fetch template_id and store_id by template_name
    const [templateMetaRows] = await connection.execute(
    'SELECT template_id, store_id FROM template WHERE template_name = ? LIMIT 1',
    [selectedTemplate]
    );

    if (templateMetaRows.length === 0) {
    throw new Error(`No template found with name: ${selectedTemplate}`);
    }

    const { template_id, store_id } = templateMetaRows[0];
    console.log(`📛 Template selected: ${selectedTemplate}, template_id: ${template_id}, store_id: ${store_id}`);

    // ✅ Step 2: Fetch template_data_id from template_data
    const [templateDataRows] = await connection.execute(
    'SELECT template_data_id FROM template_data WHERE template_id = ? AND store_id = ? ORDER BY template_data_id DESC LIMIT 1',
    [template_id, store_id]
    );

    if (templateDataRows.length === 0) {
    throw new Error(`No template data found for template_id: ${template_id} and store_id: ${store_id}`);
    }

    const { template_data_id } = templateDataRows[0];
    console.log(`📦 Template Data ID: ${template_data_id}`);

    console.log(`📛 Template selected: ${selectedTemplate}, ID: ${template_id}, Data ID: ${template_data_id}`);


    // 2. Fetch store data
    const [storeRows] = await connection.execute(
      'SELECT * FROM stores WHERE id = ?',
      [store_id]
    );

    if (storeRows.length === 0) {
      throw new Error(`Store not found with id: ${store_id}`);
    }

    const storeData = storeRows[0];
    console.log('🏪 Store data fetched for:', storeData.shop);

    

    // 4. Fetch template structure (we still need the structure, just not the database fallback values)
    const [templateRows] = await connection.execute(
      'SELECT * FROM template_variable WHERE template_data_id = ? ORDER BY template_variable_id',
      [template_data_id]
    );

    if (templateRows.length === 0) {
      throw new Error(`No template variables found for template_data_id: ${template_data_id}`);
    }

    console.log(`📄 Template structure fetched: ${templateRows} variables`);

    // ✅ 5. Build template content using USER-ENTERED fallback values
    const templateContent = buildTemplateContentWithUserFallbacks(templateRows, fallbackValues);

    

    

    // 6. Send WhatsApp test message
    try {
      const messageResult = await sendWhatsAppMessage(
        phonenumber,
        selectedTemplate,
        templateContent,
        storeData
      );

      console.log(`✅ Test WhatsApp message sent successfully for "${selectedTemplate}"`);
      
      return NextResponse.json({ 
        status: "success", 
        message: `Test message sent successfully using your fallback values`,
        templateName: selectedTemplate,
        sentTo: phonenumber,
        usedFallbackValues: fallbackValues,
        templateContent: templateContent,
        messageResult: messageResult
      });

    } catch (messageError) {
      console.error(`❌ Failed to send test WhatsApp message:`, messageError);
      throw new Error(`Failed to send test message: ${messageError.message}`);
    }

  } catch (err) {
    console.error("❌ Error processing test request:", err);
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

// Keep the existing GET method for fetching orders
export async function GET() {
  try {
    return NextResponse.json({ 
      status: "success", 
      message: "Test API is working",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in GET request:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}