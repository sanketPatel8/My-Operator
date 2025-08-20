import mysql from 'mysql2/promise';

export async function POST(req) {
  try {
    const body = await req.json();
    const { id, countrycode, phonenumber, phone_number_id, waba_id } = body;

    const connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    });

    // 1. Update store
    const [updateResult] = await connection.execute(
      `UPDATE stores SET countrycode = ?, phonenumber = ?, phone_number_id = ?, waba_id = ? WHERE id = ?`,
      [countrycode, phonenumber, phone_number_id, waba_id, id]
    );

    if (updateResult.affectedRows === 0) {
      await connection.end();
      return new Response(JSON.stringify({ message: 'No matching store found' }), { status: 404 });
    }

    // 2. Clear old templates and their template_data + template_variable
    const [existingTemplates] = await connection.execute(
      `SELECT template_id FROM template WHERE store_id = ?`, [id]
    );

    const templateIds = existingTemplates.map(row => row.template_id);

    if (templateIds.length > 0) {
      const [templateDataRows] = await connection.execute(
        `SELECT template_data_id FROM template_data WHERE template_id IN (${templateIds.map(() => '?').join(',')})`,
        templateIds
      );

      const templateDataIds = templateDataRows.map(row => row.template_data_id);

      if (templateDataIds.length > 0) {
        await connection.execute(
          `DELETE FROM template_variable WHERE template_data_id IN (${templateDataIds.map(() => '?').join(',')})`,
          templateDataIds
        );
      }

      await connection.execute(
        `DELETE FROM template_data WHERE template_id IN (${templateIds.map(() => '?').join(',')})`,
        templateIds
      );
    }

    await connection.execute(`DELETE FROM template WHERE store_id = ?`, [id]);

    // 3. Fetch from API
    const templateApiUrl = `https://publicapi.myoperator.co/chat/templates?waba_id=${waba_id}&limit=100&offset=0`;

    const response = await fetch(templateApiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer KIM7l16W0ijm6loVbaKoK4gsHJrrFt8LjceH9RyEna`,
        'X-MYOP-COMPANY-ID': '5cd40f6554442586',
      },
      signal: AbortSignal.timeout(30000),
    });

    console.log("whole response:::", response);
    

    if (!response.ok) {
      await connection.end();
      return new Response(JSON.stringify({ message: 'Failed to fetch templates from external API' }), { status: 500 });
    }

    const data = await response.json();

    if (!data?.data?.results?.length) {
      await connection.end();
      return new Response(JSON.stringify({ message: 'No templates found from external API' }), { status: 200 });
    }

    const templates = data.data.results;
    const seenTemplates = new Set();
    let insertedTemplateCount = 0;
    let insertedTemplateDataCount = 0;

    for (const template of templates) {
      const { name: template_name, category, components } = template;

      if (!template_name || !category) continue;

      const uniqueKey = `${category}::${template_name}`;
      if (seenTemplates.has(uniqueKey)) continue;
      seenTemplates.add(uniqueKey);

      // Insert into template
      const [templateInsertResult] = await connection.execute(
        `INSERT INTO template (store_id, category, template_name, created_at, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())`,
        [id, category, template_name]
      );

      const templateId = templateInsertResult.insertId;
      insertedTemplateCount++;

      // Insert into template_data
      if (Array.isArray(components)) {
        const content = JSON.stringify(components);

        console.log("content whole:::", content);
        

        const [templateDataInsertResult] = await connection.execute(
          `INSERT INTO template_data (template_id, content, created_at, updated_at)
           VALUES (?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())`,
          [templateId, content]
        );

        insertedTemplateDataCount++;
        const templateDataId = templateDataInsertResult.insertId;

        // Insert into template_variable
        // Insert into template_variable
// Insert every component as-is into template_variable
for (const component of components) {
  const { type } = component;

  if (!type) continue;

  await connection.execute(
    `INSERT INTO template_variable (template_data_id, type, value, created_at, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())`,
    [templateDataId, type, JSON.stringify(component)]
  );
}


      }
    }

    await connection.end();

    return new Response(JSON.stringify({
      message: 'Store, templates and template_data updated successfully',
      templateCount: insertedTemplateCount,
      templateDataCount: insertedTemplateDataCount,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Update error:', error);
    return new Response(JSON.stringify({
      message: 'Error updating store and templates',
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
