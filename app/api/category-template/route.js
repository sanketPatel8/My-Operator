// import mysql from "mysql2/promise";
// import { NextResponse } from "next/server";
// import crypto from "crypto";

// const ALGORITHM = "aes-256-cbc";
// const SECRET_KEY = Buffer.from(process.env.SECRET_KEY, "hex"); // 32 bytes

// function decrypt(token) {
//   try {
//     const [ivHex, encryptedData] = token.split(":");
//     const iv = Buffer.from(ivHex, "hex");
//     const encryptedText = Buffer.from(encryptedData, "hex");
//     const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
//     let decrypted = decipher.update(encryptedText);
//     decrypted = Buffer.concat([decrypted, decipher.final()]);
//     return decrypted.toString();
//   } catch (error) {
//     throw new Error("Invalid token");
//   }
// }

// export async function GET(req) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const storeToken = searchParams.get("storeToken");
//     const categoryEventId = searchParams.get("category_event_id");

//     if (!storeToken) {
//       return NextResponse.json(
//         { message: "Store token is required" },
//         { status: 400 }
//       );
//     }

//     // Decrypt the token to get the store ID
//     let storeId;
//     try {
//       storeId = decrypt(storeToken);
//     } catch (error) {
//       return NextResponse.json(
//         { message: "Invalid store token" },
//         { status: 401 }
//       );
//     }

//     const connection = await mysql.createConnection({
//       host: process.env.DATABASE_HOST,
//       user: process.env.DATABASE_USER,
//       password: process.env.DATABASE_PASSWORD,
//       database: process.env.DATABASE_NAME,
//       charset: "utf8mb4",
//       collation: "utf8mb4_unicode_ci",
//     });

//     // First get the current phone number from stores table
//     const [storeInfo] = await connection.execute(
//       `SELECT phonenumber FROM stores WHERE id = ?`,
//       [storeId]
//     );

//     if (storeInfo.length === 0) {
//       await connection.end();
//       return new Response(JSON.stringify({ message: "Store not found" }), {
//         status: 404,
//       });
//     }

//     const currentStorePhoneNumber = storeInfo[0].phonenumber;

//     if (!currentStorePhoneNumber) {
//       await connection.end();
//       return new Response(
//         JSON.stringify({
//           message: "No phone number set for this store",
//           templates: [],
//         }),
//         { status: 200 }
//       );
//     }

//     let filteredResults = [];

//     // Check if category_event_id is provided
//     if (categoryEventId) {
//       // Get the specific category_event record
//       const [categoryEvent] = await connection.execute(
//         `
//         SELECT ce.*, c.category_name
//         FROM category_event ce
//         LEFT JOIN category c ON ce.category_id = c.category_id
//         WHERE ce.category_event_id = ? AND ce.store_id = ?
//       `,
//         [categoryEventId, storeId]
//       );

//       if (categoryEvent.length === 0) {
//         await connection.end();
//         return new Response(
//           JSON.stringify({
//             message: "Category event not found for this store",
//             templates: [],
//           }),
//           { status: 404 }
//         );
//       }

//       const eventData = categoryEvent[0];

//       // If specific template IDs are set in category_event, use them
//       if (
//         eventData.template_id &&
//         eventData.template_id.toString().trim() !== ""
//       ) {
//         // Parse comma-separated IDs and filter by specific template IDs
//         const templateIds = eventData.template_id
//           .toString()
//           .split(",")
//           .map((id) => id.trim())
//           .filter((id) => id !== "");

//         if (templateIds.length > 0) {
//           const placeholders = templateIds.map(() => "?").join(",");
//           const [specificTemplates] = await connection.execute(
//             `
//             SELECT t.*, td.template_data_id, td.content, tv.template_variable_id,
//                    tv.type, tv.value, tv.variable_name, tv.component_type, tv.tamplate_image,
//                    tv.mapping_field, tv.fallback_value,
//                    tv.created_at as variable_created_at, tv.updated_at as variable_updated_at
//             FROM template t
//             INNER JOIN stores s ON t.store_id = s.id
//             LEFT JOIN template_data td ON t.template_id = td.template_id
//             LEFT JOIN template_variable tv ON td.template_data_id = tv.template_data_id
//             WHERE t.template_id IN (${placeholders}) AND t.store_id = ? AND t.phonenumber = s.phonenumber
//             ORDER BY t.template_id, td.template_data_id, tv.template_variable_id
//           `,
//             [...templateIds, storeId]
//           );

//           filteredResults = groupTemplateData(
//             specificTemplates,
//             "category_event_specific",
//             eventData
//           );
//         }
//       }
//       // If no specific template IDs, try to match by category name
//       else if (eventData.category_id) {
//         const [categoryTemplates] = await connection.execute(
//           `
//           SELECT t.*, td.template_data_id, td.content, tv.template_variable_id,
//                  tv.type, tv.value, tv.variable_name, tv.component_type,
//                  tv.mapping_field, tv.fallback_value, tv.tamplate_image,
//                  tv.created_at as variable_created_at, tv.updated_at as variable_updated_at
//           FROM template t
//           INNER JOIN stores s ON t.store_id = s.id
//           LEFT JOIN template_data td ON t.template_id = td.template_id
//           LEFT JOIN template_variable tv ON td.template_data_id = tv.template_data_id
//           LEFT JOIN category c ON c.category_name = t.category
//           WHERE c.category_id = ? AND t.store_id = ? AND t.phonenumber = s.phonenumber
//           ORDER BY t.template_id, td.template_data_id, tv.template_variable_id
//         `,
//           [eventData.category_id, storeId]
//         );

//         filteredResults = groupTemplateData(
//           categoryTemplates,
//           "category_event_by_category",
//           eventData
//         );
//       }
//       // Fallback: return all templates for the store
//       else {
//         const [allTemplates] = await connection.execute(
//           `
//           SELECT t.*, td.template_data_id, td.content, tv.template_variable_id,
//                  tv.type, tv.value, tv.variable_name, tv.component_type,
//                  tv.mapping_field, tv.fallback_value, tv.tamplate_image,
//                  tv.created_at as variable_created_at, tv.updated_at as variable_updated_at
//           FROM template t
//           INNER JOIN stores s ON t.store_id = s.id
//           LEFT JOIN template_data td ON t.template_id = td.template_id
//           LEFT JOIN template_variable tv ON td.template_data_id = tv.template_data_id
//           WHERE t.store_id = ? AND t.phonenumber = s.phonenumber
//           ORDER BY t.template_id, td.template_data_id, tv.template_variable_id
//         `,
//           [storeId]
//         );

//         filteredResults = groupTemplateData(
//           allTemplates,
//           "category_event_all",
//           eventData
//         );
//       }
//     } else {
//       // No category_event_id provided, return all template data
//       const [allTemplates] = await connection.execute(
//         `
//         SELECT t.*, td.template_data_id, td.content, tv.template_variable_id,
//                tv.type, tv.value, tv.variable_name, tv.component_type,
//                tv.mapping_field, tv.fallback_value, tv.tamplate_image,
//                tv.created_at as variable_created_at, tv.updated_at as variable_updated_at
//         FROM template t
//         INNER JOIN stores s ON t.store_id = s.id
//         LEFT JOIN template_data td ON t.template_id = td.template_id
//         LEFT JOIN template_variable tv ON td.template_data_id = tv.template_data_id
//         WHERE t.store_id = ? AND t.phonenumber = s.phonenumber
//         ORDER BY t.template_id, td.template_data_id, tv.template_variable_id
//       `,
//         [storeId]
//       );

//       filteredResults = groupTemplateData(allTemplates, "all_templates");
//     }

//     await connection.end();

//     return new Response(
//       JSON.stringify({
//         success: true,
//         storeId: storeId,
//         currentStorePhoneNumber: currentStorePhoneNumber,
//         categoryEventId: categoryEventId || null,
//         dataSource: categoryEventId
//           ? "category_event_filtered"
//           : "all_templates",
//         totalResults: filteredResults.length,
//         templates: filteredResults,
//       }),
//       {
//         status: 200,
//         headers: { "Content-Type": "application/json" },
//       }
//     );
//   } catch (error) {
//     console.error("Error fetching templates:", error);
//     return new Response(
//       JSON.stringify({
//         message: "Error fetching templates",
//         error: error.message,
//       }),
//       {
//         status: 500,
//         headers: { "Content-Type": "application/json" },
//       }
//     );
//   }
// }

// function groupTemplateData(templateRows, source, eventData = null) {
//   const templatesMap = new Map();

//   templateRows.forEach((row) => {
//     const templateId = row.template_id;

//     if (!templatesMap.has(templateId)) {
//       templatesMap.set(templateId, {
//         source: source,
//         template_id: templateId,
//         category: row.category,
//         template_name: row.template_name,
//         phonenumber: row.phonenumber,
//         created_at: row.created_at,
//         updated_at: row.updated_at,
//         // Add category_event specific fields if available
//         ...(eventData && {
//           category_event_id: eventData.category_event_id,
//           category_id: eventData.category_id,
//           title: eventData.title,
//           subtitle: eventData.subtitle,
//           delay: eventData.delay,
//           category_event_created_at: eventData.created_at,
//           category_event_updated_at: eventData.updated_at,
//           category_name: eventData.category_name || null,
//         }),
//         data: new Map(),
//       });
//     }

//     const template = templatesMap.get(templateId);

//     if (row.template_data_id) {
//       const templateDataId = row.template_data_id;

//       if (!template.data.has(templateDataId)) {
//         template.data.set(templateDataId, {
//           template_data_id: templateDataId,
//           content: row.content ? JSON.parse(row.content) : null,
//           variables: [],
//         });
//       }

//       if (row.template_variable_id) {
//         const templateData = template.data.get(templateDataId);
//         const variableData = {
//           template_variable_id: row.template_variable_id,
//           type: row.type,
//           value: row.value
//             ? row.value.startsWith("{") || row.value.startsWith("[")
//               ? JSON.parse(row.value)
//               : row.value
//             : null,
//           variable_name: row.variable_name,
//           component_type: row.component_type,
//           mapping_field: row.mapping_field,
//           fallback_value: row.fallback_value,
//           created_at: row.variable_created_at,
//           updated_at: row.variable_updated_at,
//         };

//         // Avoid duplicate variables
//         const existingVariable = templateData.variables.find(
//           (v) => v.template_variable_id === row.template_variable_id
//         );
//         if (!existingVariable) {
//           templateData.variables.push(variableData);
//         }
//       }
//     }
//   });

//   // Convert Maps to Arrays and calculate totals
//   return Array.from(templatesMap.values()).map((template) => ({
//     ...template,
//     data: Array.from(template.data.values()).map((data) => ({
//       ...data,
//       totalVariables: data.variables.length,
//     })),
//     totalTemplateData: template.data.size,
//   }));
// }

import mysql from "mysql2/promise";
import { NextResponse } from "next/server";
import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const SECRET_KEY = Buffer.from(process.env.SECRET_KEY, "hex"); // 32 bytes

function decrypt(token) {
  try {
    const [ivHex, encryptedData] = token.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const encryptedText = Buffer.from(encryptedData, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    throw new Error("Invalid token");
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const storeToken = searchParams.get("storeToken");
    const categoryEventId = searchParams.get("category_event_id");

    if (!storeToken) {
      return NextResponse.json(
        { message: "Store token is required" },
        { status: 400 }
      );
    }

    // Decrypt the token to get the store ID
    let storeId;
    try {
      storeId = decrypt(storeToken);
    } catch (error) {
      return NextResponse.json(
        { message: "Invalid store token" },
        { status: 401 }
      );
    }

    const connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      charset: "utf8mb4",
      collation: "utf8mb4_unicode_ci",
    });

    // First get the current phone number from stores table
    const [storeInfo] = await connection.execute(
      `SELECT phonenumber FROM stores WHERE id = ?`,
      [storeId]
    );

    if (storeInfo.length === 0) {
      await connection.end();
      return new Response(JSON.stringify({ message: "Store not found" }), {
        status: 404,
      });
    }

    const currentStorePhoneNumber = storeInfo[0].phonenumber;

    if (!currentStorePhoneNumber) {
      await connection.end();
      return new Response(
        JSON.stringify({
          message: "No phone number set for this store",
          templates: [],
        }),
        { status: 200 }
      );
    }

    let filteredResults = [];

    // Check if category_event_id is provided
    if (categoryEventId) {
      // Get the specific category_event record
      const [categoryEvent] = await connection.execute(
        `
        SELECT ce.*, c.category_name
        FROM category_event ce
        LEFT JOIN category c ON ce.category_id = c.category_id
        WHERE ce.category_event_id = ? AND ce.store_id = ?
      `,
        [categoryEventId, storeId]
      );

      if (categoryEvent.length === 0) {
        await connection.end();
        return new Response(
          JSON.stringify({
            message: "Category event not found for this store",
            templates: [],
          }),
          { status: 404 }
        );
      }

      const eventData = categoryEvent[0];

      // If specific template IDs are set in category_event, use them
      if (
        eventData.template_id &&
        eventData.template_id.toString().trim() !== ""
      ) {
        // Parse comma-separated IDs and filter by specific template IDs
        const templateIds = eventData.template_id
          .toString()
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id !== "");

        if (templateIds.length > 0) {
          const placeholders = templateIds.map(() => "?").join(",");
          const [specificTemplates] = await connection.execute(
            `
            SELECT t.*, td.template_data_id, td.content, tv.template_variable_id, 
                   tv.type, tv.value, tv.variable_name, tv.component_type, tv.tamplate_image,
                   tv.mapping_field, tv.fallback_value,
                   tv.created_at as variable_created_at, tv.updated_at as variable_updated_at
            FROM template t
            INNER JOIN stores s ON t.store_id = s.id
            LEFT JOIN template_data td ON t.template_id = td.template_id
            LEFT JOIN template_variable tv ON td.template_data_id = tv.template_data_id
            WHERE t.template_id IN (${placeholders}) AND t.store_id = ? AND t.phonenumber = s.phonenumber
            ORDER BY t.template_id, td.template_data_id, tv.template_variable_id
          `,
            [...templateIds, storeId]
          );

          filteredResults = groupTemplateData(
            specificTemplates,
            "category_event_specific",
            eventData
          );
        }
      }
      // If no specific template IDs, try to match by category name
      else if (eventData.category_id) {
        const [categoryTemplates] = await connection.execute(
          `
          SELECT t.*, td.template_data_id, td.content, tv.template_variable_id, 
                 tv.type, tv.value, tv.variable_name, tv.component_type, tv.tamplate_image,
                 tv.mapping_field, tv.fallback_value,
                 tv.created_at as variable_created_at, tv.updated_at as variable_updated_at
          FROM template t
          INNER JOIN stores s ON t.store_id = s.id
          LEFT JOIN template_data td ON t.template_id = td.template_id
          LEFT JOIN template_variable tv ON td.template_data_id = tv.template_data_id
          LEFT JOIN category c ON c.category_name = t.category
          WHERE c.category_id = ? AND t.store_id = ? AND t.phonenumber = s.phonenumber
          ORDER BY t.template_id, td.template_data_id, tv.template_variable_id
        `,
          [eventData.category_id, storeId]
        );

        filteredResults = groupTemplateData(
          categoryTemplates,
          "category_event_by_category",
          eventData
        );
      }
      // Fallback: return all templates for the store
      else {
        const [allTemplates] = await connection.execute(
          `
          SELECT t.*, td.template_data_id, td.content, tv.template_variable_id, 
                 tv.type, tv.value, tv.variable_name, tv.component_type, tv.tamplate_image,
                 tv.mapping_field, tv.fallback_value,
                 tv.created_at as variable_created_at, tv.updated_at as variable_updated_at
          FROM template t
          INNER JOIN stores s ON t.store_id = s.id
          LEFT JOIN template_data td ON t.template_id = td.template_id
          LEFT JOIN template_variable tv ON td.template_data_id = tv.template_data_id
          WHERE t.store_id = ? AND t.phonenumber = s.phonenumber
          ORDER BY t.template_id, td.template_data_id, tv.template_variable_id
        `,
          [storeId]
        );

        filteredResults = groupTemplateData(
          allTemplates,
          "category_event_all",
          eventData
        );
      }
    } else {
      // No category_event_id provided, return all template data
      const [allTemplates] = await connection.execute(
        `
        SELECT t.*, td.template_data_id, td.content, tv.template_variable_id, 
               tv.type, tv.value, tv.variable_name, tv.component_type, tv.tamplate_image,
               tv.mapping_field, tv.fallback_value,
               tv.created_at as variable_created_at, tv.updated_at as variable_updated_at
        FROM template t
        INNER JOIN stores s ON t.store_id = s.id
        LEFT JOIN template_data td ON t.template_id = td.template_id
        LEFT JOIN template_variable tv ON td.template_data_id = tv.template_data_id
        WHERE t.store_id = ? AND t.phonenumber = s.phonenumber
        ORDER BY t.template_id, td.template_data_id, tv.template_variable_id
      `,
        [storeId]
      );

      filteredResults = groupTemplateData(allTemplates, "all_templates");
    }

    await connection.end();

    return new Response(
      JSON.stringify({
        success: true,
        storeId: storeId,
        currentStorePhoneNumber: currentStorePhoneNumber,
        categoryEventId: categoryEventId || null,
        dataSource: categoryEventId
          ? "category_event_filtered"
          : "all_templates",
        totalResults: filteredResults.length,
        templates: filteredResults,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching templates:", error);
    return new Response(
      JSON.stringify({
        message: "Error fetching templates",
        error: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

function groupTemplateData(templateRows, source, eventData = null) {
  const templatesMap = new Map();

  templateRows.forEach((row) => {
    const templateId = row.template_id;

    if (!templatesMap.has(templateId)) {
      templatesMap.set(templateId, {
        source: source,
        template_id: templateId,
        category: row.category,
        template_name: row.template_name,
        phonenumber: row.phonenumber,
        created_at: row.created_at,
        updated_at: row.updated_at,
        // Add category_event specific fields if available
        ...(eventData && {
          category_event_id: eventData.category_event_id,
          category_id: eventData.category_id,
          title: eventData.title,
          subtitle: eventData.subtitle,
          delay: eventData.delay,
          category_event_created_at: eventData.created_at,
          category_event_updated_at: eventData.updated_at,
          category_name: eventData.category_name || null,
        }),
        data: new Map(),
      });
    }

    const template = templatesMap.get(templateId);

    if (row.template_data_id) {
      const templateDataId = row.template_data_id;

      if (!template.data.has(templateDataId)) {
        template.data.set(templateDataId, {
          template_data_id: templateDataId,
          content: row.content ? JSON.parse(row.content) : null,
          variables: [],
        });
      }

      if (row.template_variable_id) {
        const templateData = template.data.get(templateDataId);
        const variableData = {
          template_variable_id: row.template_variable_id,
          type: row.type,
          value: row.value
            ? row.value.startsWith("{") || row.value.startsWith("[")
              ? JSON.parse(row.value)
              : row.value
            : null,
          variable_name: row.variable_name,
          component_type: row.component_type,
          tamplate_image: row.tamplate_image, // Added this field
          mapping_field: row.mapping_field,
          fallback_value: row.fallback_value,
          created_at: row.variable_created_at,
          updated_at: row.variable_updated_at,
        };

        // Avoid duplicate variables
        const existingVariable = templateData.variables.find(
          (v) => v.template_variable_id === row.template_variable_id
        );
        if (!existingVariable) {
          templateData.variables.push(variableData);
        }
      }
    }
  });

  // Convert Maps to Arrays and calculate totals
  return Array.from(templatesMap.values()).map((template) => ({
    ...template,
    data: Array.from(template.data.values()).map((data) => ({
      ...data,
      totalVariables: data.variables.length,
    })),
    totalTemplateData: template.data.size,
  }));
}
