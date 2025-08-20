import mysql from 'mysql2/promise';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('store_id');

    if (!storeId) {
      return new Response(JSON.stringify({ message: 'store_id is required' }), { status: 400 });
    }

    const connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      charset: 'utf8mb4',
      collation: 'utf8mb4_unicode_ci',
    });

    // Get all templates for this store
    const [templates] = await connection.execute(
      `SELECT * FROM template WHERE store_id = ?`,
      [storeId]
    );

    const results = [];

    for (const template of templates) {
      const { template_id, category, template_name, created_at, updated_at } = template;

      // Get template_data for this template
      const [templateData] = await connection.execute(
        `SELECT * FROM template_data WHERE template_id = ?`,
        [template_id]
      );

      const dataWithVariables = [];

      for (const data of templateData) {
        const { template_data_id, content } = data;

        // Get template_variable for this template_data
        const [variables] = await connection.execute(
          `SELECT * FROM template_variable WHERE template_data_id = ?`,
          [template_data_id]
        );

        dataWithVariables.push({
          template_data_id,
          content: JSON.parse(content), // if needed as object
          variables: variables.map(v => ({
            template_variable_id: v.template_variable_id,
            type: v.type,
            value: JSON.parse(v.value), // parse if JSON string
          })),
        });
      }

      results.push({
        template_id,
        category,
        template_name,
        created_at,
        updated_at,
        data: dataWithVariables,
      });
    }

    await connection.end();

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching templates:', error);
    return new Response(JSON.stringify({
      message: 'Error fetching templates',
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
