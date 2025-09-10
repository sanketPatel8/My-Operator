import { NextResponse } from "next/server";
import pool from "@/lib/db"; // adjust this path to your db connection

async function sendWhatsAppMessage(phone, templateName, content, row) {
  console.log("👉 sendWhatsAppMessage called with:", {
    phone,
    templateName,
    content,
    row,
  });

  const payload = {
    phone_number_id: row.phone_number_id,
    customer_country_code: "91",
    customer_number: "9313897902", // ✅ using phone param
    data: {
      type: "template",
      language: "en",
      context: {
        template_name: templateName,
        language: "en",
        body: content?.body?.example ?? {}, // ✅ safe fallback
        buttons: [
          {
            index: 0,
            id: content?.checkout_url || "https://example.com/checkout",
          },
        ],
      },
    },
  };

  console.log(payload, "payload");

  console.log("📦 Payload being sent:", JSON.stringify(payload, null, 2));
  console.log(
    "🔑 API URL:",
    `${process.env.NEXT_PUBLIC_BASEURL}/chat/messages`
  );
  console.log("📝 Headers:", {
    "Content-Type": "application/json",
    Authorization: `Bearer ${row.whatsapp_api_key}`,
    "X-MYOP-COMPANY-ID": String(row.company_id),
  });

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASEURL}/chat/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${row.whatsapp_api_key}`,
          "X-MYOP-COMPANY-ID": String(row.company_id),
        },
        body: JSON.stringify(payload),
      }
    );

    console.log("📥 Response status:", res.status, res.statusText);

    let result;
    try {
      result = await res.json();
      console.log("✅ Parsed JSON response:", result);
    } catch (err) {
      const fallbackText = await res.text();
      console.error("❌ Failed to parse JSON, raw response:", fallbackText);
      result = { error: true, status: res.status, text: fallbackText };
    }

    return result;
  } catch (error) {
    console.error("🔥 Error sending WhatsApp message:", error);
    return { error: true, message: error.message };
  }
}

function buildTemplateContent(templateRows, data) {
  const content = {
    header: null,
    body: null,
    footer: null,
    buttons: [],
    checkout_url: data.checkout_url,
  };
  const bodyExample = {};

  for (const row of templateRows) {
    const value = JSON.parse(row.value || "{}");
    switch (row.component_type) {
      case "HEADER":
        content.header = value;
        break;
      case "BODY":
        content.body = value;
        if (row.mapping_field && row.variable_name) {
          bodyExample[row.variable_name] = getMappedValue(
            row.mapping_field,
            data
          );
        }
        break;
      case "FOOTER":
        content.footer = value;
        break;
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

export async function GET() {
  try {
    const query = `SELECT c.*,
    CASE
        WHEN c.reminder_1 = 0 AND c.reminder_2 = 0 AND c.reminder_3 = 0 THEN 'reminder_1'
        WHEN c.reminder_1 = 1 AND c.reminder_2 = 0 AND c.reminder_3 = 0 THEN 'reminder_2'
        WHEN c.reminder_1 = 1 AND c.reminder_2 = 1 AND c.reminder_3 = 0 THEN 'reminder_3'
        ELSE 'reminder_3'
    END AS active_reminder,
    CASE
        WHEN c.reminder_1 = 0 AND c.reminder_2 = 0 AND c.reminder_3 = 0 THEN 'Reminder 1'
        WHEN c.reminder_1 = 1 AND c.reminder_2 = 0 AND c.reminder_3 = 0 THEN 'Reminder 2'
        WHEN c.reminder_1 = 1 AND c.reminder_2 = 1 AND c.reminder_3 = 0 THEN 'Reminder 3'
        ELSE 'Reminder 3'
    END AS reminder_title,
    COALESCE(ce.delay, 0) AS reminder_delay,
    DATE_ADD(c.updated_at, INTERVAL COALESCE(ce.delay, 0) MINUTE) AS reminder_trigger_time,
    s.id AS store_id,
    s.phone_number_id,
    s.whatsapp_api_key,
    s.company_id,
    ce.template_id,
    t.template_name,
    ce.template_data_id,
    td.content AS template_data_content,
    ce.template_variable_id,
    GROUP_CONCAT(tv.mapping_field) AS template_variable_mapping_fields,
    GROUP_CONCAT(tv.fallback_value) AS template_variable_fallback_values
FROM checkouts c
LEFT JOIN stores s 
    ON c.shop_url = s.shop
LEFT JOIN category_event ce
    ON ce.store_id = s.id
    AND ce.status = 1
    AND ce.title = CASE
        WHEN c.reminder_1 = 0 AND c.reminder_2 = 0 AND c.reminder_3 = 0 THEN 'Reminder 1'
        WHEN c.reminder_1 = 1 AND c.reminder_2 = 0 AND c.reminder_3 = 0 THEN 'Reminder 2'
        WHEN c.reminder_1 = 1 AND c.reminder_2 = 1 AND c.reminder_3 = 0 THEN 'Reminder 3'
    END
LEFT JOIN template t 
    ON t.template_id = ce.template_id
LEFT JOIN template_data td 
    ON td.template_data_id = ce.template_data_id
LEFT JOIN template_variable tv 
    ON FIND_IN_SET(tv.template_variable_id, ce.template_variable_id)
WHERE c.reminder_1 = 0 OR c.reminder_2 = 0 OR c.reminder_3 = 0
GROUP BY c.id;`;

    const [rows] = await pool.query(query);

    // Prepare response data
    const response = rows.map((row) => ({
      id: row.id,
      shop_url: row.shop_url,
      active_reminder: row.active_reminder,
      reminder_title: row.reminder_title,
      reminder_delay: row.reminder_delay,
      reminder_trigger_time: row.reminder_trigger_time,
    }));

    rows.forEach((row) => {
      console.log(row.customer_phone, "row.customer_phone");
      console.log(row.template_name, "row.template_name");
      console.log(row.template_data_content, "row.template_data_content");
      sendWhatsAppMessage(
        row.customer_phone,
        row.template_name,
        row.template_data_content,
        row
      ); // run your function for each row
    });

    return NextResponse.json(
      { success: true, data: response, fullData: rows },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Query Error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
