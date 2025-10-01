import pool from "@/lib/db";
import { NextResponse } from "next/server";
import fetch from "node-fetch"; // required if Node < 18

export async function POST(req) {
  try {
    const body = await req.json();
    const { orderId, status } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "orderId is required" },
        { status: 400 }
      );
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
              header: templateContent.header || {},
              body: templateContent.body.example || {},
              buttons: templateContent.buttons || [],
            },
          },
          reply_to: null,
          trail: {
            name: "Shopify_cod_paid",
          },
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
        return NextResponse.json(
          { success: true, message: "success" },
          { status: 200 }
        );
      } catch (error) {
        console.error("❌ Error sending WhatsApp message:", error);
        throw error;
      }
    }

    // 1️⃣ Fetch shop and access_token from DB
    const [rows] = await pool.query(
      `SELECT 
          pco.shop,
          pco.order_id,
          pco.order_status_url,
          pco.payment_gateway_names,
          pco.phone,
          pco.customer,
          pco.line_items,
          pco.order_number,
          pco.total_price,
          s.access_token
       FROM placed_code_order pco
       JOIN stores s ON s.shop = pco.shop
       WHERE pco.id = ?`,
      [orderId]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    const {
      shop,
      order_id,
      order_status_url,
      payment_gateway_names,
      phonenumber,
      customer,
      line_items,
      order_number,
      total_price,
      access_token,
    } = rows[0];

    const data = rows[0];

    const customerData = JSON.parse(customer);
    const first_line_items_data = JSON.parse(line_items);
    const line_items_data = first_line_items_data[0];

    console.log(rows, "Fetched order and store details");

    // Query the table for the given id where confirmation_status is NOT 0
    const [confirmation_status] = await pool.query(
      "SELECT confirmation_status FROM placed_code_order WHERE id = ? AND confirmation_status != 0",
      [orderId]
    );

    console.log(status, "status");

    // Check if any record exists
    if (confirmation_status.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Your Reply has already been Submitted",
          data: "helo",
        },
        { status: 200 }
      );
    }

    if (status == "yes") {
      const eventTitles = ["Convert COD to Paid"];

      const [result] = await pool.execute(
        "UPDATE placed_code_order SET confirmation_status = ? WHERE id = ?",
        [1, orderId]
      );

      console.log("Update result:", result);

      if (result.affectedRows === 0) {
        console.warn(
          `⚠️ No order updated. Check if order_id ${order_id} exists.`
        );
      } else {
        console.log(`✅ Order ${order_id} updated successfully.`);
      }

      function getMappedValue(
        mappingField,
        data,
        customerData,
        line_items_data,
        storeData
      ) {
        switch (mappingField) {
          case "Name":
            return customerData.first_name || "Customer";
          case "Order id":
            return String(data.order_id);
          case "Phone number":
            return data.phone;
          case "Payment Url":
            return data.order_status_url;
          case "Quantity":
            return line_items_data.current_quantity;
          case "Total price":
            return data.total_price || "00";
          case "Tracking Order Link":
            return data.order_status_url || "no url";
          case "Online Shop Url":
            return (
              storeData?.public_shop_url || "https://your-store.myshopify.com"
            );
          case "Brand Name":
            return storeData?.brand_name || "Brand";
          default:
            return "";
        }
      }

      // Updated buildTemplateContent function to handle dynamic buttons
      function buildTemplateContent(
        templateRows,
        data,
        customerData,
        line_items_data,
        image_id,
        storeData
      ) {
        const templateContent = {
          header: null,
          body: null,
          footer: null,
          buttons: [],
        };

        const bodyExample = {};

        console.log("rows", templateRows);

        console.log("data whole", data);

        for (const row of templateRows) {
          const value = JSON.parse(row.value || "{}");

          console.log(value, "all value");

          switch (row.component_type) {
            case "HEADER":
              templateContent.header = value;
              console.log("value for header", value);
              const media = value.media_id;
              console.log("media id ", media);
              if (image_id != null) {
                templateContent.header = { media_id: image_id };
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
                  data,
                  customerData,
                  line_items_data,
                  storeData
                );
              }
              break;

            case "FOOTER":
              templateContent.footer = value;
              break;

            case "BUTTONS":
            case "BUTTONS_COMPONENT":
              if (value && typeof value === "object") {
                // Check if value.buttons exists and is an array
                if (value.buttons && Array.isArray(value.buttons)) {
                  if (templateContent.buttons.length === 0) {
                    const output = value.buttons.map((button, index) => {
                      // Ensure button has the required properties
                      if (
                        button &&
                        button.example &&
                        typeof button.example === "object"
                      ) {
                        const key = Object.keys(button.example)[0];
                        const replace_url = button.url.replace(
                          /{{.*?}}/,
                          data.order_status_url
                        );
                        return {
                          index:
                            button.index !== undefined ? button.index : index,
                          [key]: replace_url || button.example[key],
                        };
                      }
                      // Fallback for malformed button data
                      return {
                        index: index,
                        link: replace_url || "#",
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
              } else {
                console.warn("⚠️ Button value is null or invalid:", value);
              }

              //   if(value!=null){

              // if (templateContent.buttons.length === 0) {

              // // const values = Object.values(userFallbackValues).slice(-2);
              // // const result = values.map((value, i) => ({ index: i, "link": value }));

              // // console.log(result);
              // // templateContent.buttons.push(...result);

              //     const output = value.buttons.map(button => {
              //     const key = Object.keys(button.example)[0];
              //     return {
              //       index: button.index,
              //       [key]: button.url
              //     };
              //   });

              //   console.log(output);
              //   templateContent.buttons.push(...output);
              //     }
              //   }
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

      // 🔍 3a. Get phone number and store_id from store
      const [storePhoneRows] = await pool.query(
        "SELECT phonenumber, id FROM stores WHERE shop = ? LIMIT 1",
        [shop]
      );

      if (storePhoneRows.length === 0) {
        throw new Error("No store found with shop domain");
      }

      const [storeRows] = await pool.query(
        "SELECT * FROM stores WHERE shop = ?",
        [shop]
      );

      if (storeRows.length === 0) {
        throw new Error("Store not found with id ");
      }

      const storeData = storeRows[0];

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
          const [categoryRows] = await pool.query(
            "SELECT template_id, template_data_id, status FROM category_event WHERE title = ? AND phonenumber = ? AND store_id = ? LIMIT 1",
            [eventTitle, storePhoneNumber, storeId]
          );

          if (categoryRows.length === 0) {
            console.log(
              `⚠️ No template found for event: ${eventTitle} with store_id: ${storeId}`
            );
            return NextResponse.json(
              {
                success: true,
                message: "message done",
                data: "helo",
              },
              { status: 200 }
            );
          }

          const { template_id, template_data_id, status } = categoryRows[0];
          console.log(
            `🧩 Template IDs found for "${eventTitle}":`,
            template_id,
            template_data_id
          );

          // Fetch template name using template_id + phone number + store_id
          const [templateRowsMeta] = await pool.query(
            "SELECT template_name FROM template WHERE template_id = ? AND phonenumber = ? AND store_id = ? LIMIT 1",
            [template_id, storePhoneNumber, storeId]
          );

          if (templateRowsMeta.length === 0) {
            console.log(
              `⚠️ No template name found for template_id: ${template_id} with store_id: ${storeId}`
            );
            return NextResponse.json(
              {
                success: true,
                message: "message done",
                data: "helo",
              },
              { status: 200 }
            );
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
          const [templateRows] = await pool.query(
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

          const [templateimage] = await pool.query(
            "SELECT tamplate_image FROM template_variable WHERE template_data_id = ?",
            [template_data_id]
          );

          console.log("template image row", templateimage);

          const image_id = templateimage[0]?.tamplate_image;

          console.log("First template image:", image_id);

          // ✅ Build template content with mapped data
          const templateContent = buildTemplateContent(
            templateRows,
            data,
            customerData,
            line_items_data,
            image_id,
            storeData
          );

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
          const phoneDetails = extractPhoneDetails(data);

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
            //       // 4️⃣ Delete the order from placed_code_order only after successful cancellation
            // await pool.query(`DELETE FROM placed_code_order WHERE id = ?`, [orderId]);

            // console.log(`Order ${orderId} deleted from placed_code_order`);
            messageResults.push({
              eventTitle,
              templateName,
              status: "success",
              result: messageResult,
            });
            sentMessages.push(templateName);
            return NextResponse.json(
              {
                success: true,
                message: "message done",
                data: "helo",
              },
              { status: 200 }
            );
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
    } else {
      const [result] = await pool.execute(
        "UPDATE placed_code_order SET confirmation_status = ? WHERE id = ?",
        [2, orderId]
      );

      console.log("Update result:", result);

      if (result.affectedRows === 0) {
        console.warn(
          `⚠️ No order updated. Check if order_id ${order_id} exists.`
        );
      } else {
        console.log(`✅ Order ${order_id} updated successfully.`);
      }

      // 2️⃣ Call Shopify API to cancel the order
      const shopifyUrl = `https://${shop}/admin/api/2025-07/orders/${order_id}/cancel.json`;

      const cancelResponse = await fetch(shopifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": access_token,
        },
        body: JSON.stringify({
          reason: "customer",
          email: true,
          restock: true,
        }),
      });

      const cancelData = await cancelResponse.json();

      // 3️⃣ If Shopify cancel fails, do not delete order
      if (!cancelResponse.ok) {
        return NextResponse.json(
          {
            success: false,
            message: "Failed to cancel order on Shopify",
            data: cancelData,
          },
          { status: cancelResponse.status }
        );
      }

      // // 4️⃣ Delete the order from placed_code_order only after successful cancellation
      // await pool.query(`DELETE FROM placed_code_order WHERE id = ?`, [orderId]);

      // console.log(`Order ${orderId} deleted from placed_code_order`);

      // 5️⃣ Return success response
      return NextResponse.json(
        {
          success: true,
          message: "Order cancelled successfully",
          data: cancelData,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("POST /api/place-order error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
