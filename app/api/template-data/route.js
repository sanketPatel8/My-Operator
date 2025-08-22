import mysql from 'mysql2/promise';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('store_id');
    const phonenumber = searchParams.get('phonenumber'); // Optional filter by specific phone number

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

    // First get the current phone number from stores table
    const [storeInfo] = await connection.execute(
      `SELECT phonenumber FROM stores WHERE id = ?`,
      [storeId]
    );

    if (storeInfo.length === 0) {
      await connection.end();
      return new Response(JSON.stringify({ message: 'Store not found' }), { status: 404 });
    }

    const currentStorePhoneNumber = storeInfo[0].phonenumber;

    if (!currentStorePhoneNumber) {
      await connection.end();
      return new Response(JSON.stringify({ 
        message: 'No phone number set for this store',
        templates: []
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get templates for this store that match the current store's phone number
    let query = `
      SELECT t.* FROM template t 
      INNER JOIN stores s ON t.store_id = s.id 
      WHERE t.store_id = ? AND t.phonenumber = s.phonenumber
    `;
    let queryParams = [storeId];

    // If specific phone number is requested, add additional filter
    if (phonenumber) {
      query += ` AND t.phonenumber = ?`;
      queryParams.push(phonenumber);
    }

    // Get templates for this store (filtered by matching phone numbers)
    const [templates] = await connection.execute(query, queryParams);

    if (templates.length === 0) {
      await connection.end();
      return new Response(JSON.stringify({ 
        message: 'No templates found',
        templates: []
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const results = [];

    for (const template of templates) {
      const { template_id, category, template_name, phonenumber: templatePhone, created_at, updated_at } = template;

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

        // Separate variables by type for better organization
        const componentVariables = [];
        const mappingVariables = [];

        for (const variable of variables) {
          const variableData = {
            template_variable_id: variable.template_variable_id,
            type: variable.type,
            value: variable.value ? (variable.value.startsWith('{') || variable.value.startsWith('[') ? JSON.parse(variable.value) : variable.value) : null,
            variable_name: variable.variable_name,
            component_type: variable.component_type,
            mapping_field: variable.mapping_field,
            fallback_value: variable.fallback_value,
            created_at: variable.created_at,
            updated_at: variable.updated_at
          };

          // If it's a component (ends with _COMPONENT), add to component variables
          if (variable.type && variable.type.endsWith('_COMPONENT')) {
            componentVariables.push(variableData);
          } else {
            // Regular mapping variables
            mappingVariables.push(variableData);
          }
        }

        dataWithVariables.push({
          template_data_id,
          content: content ? JSON.parse(content) : null,
          componentVariables,
          mappingVariables,
          totalVariables: variables.length
        });
      }

      results.push({
        template_id,
        category,
        template_name,
        phonenumber: templatePhone,
        created_at,
        updated_at,
        data: dataWithVariables,
        totalTemplateData: templateData.length
      });
    }

    // Group results by phone number for better organization
    const groupedResults = results.reduce((acc, template) => {
      const phone = template.phonenumber || 'unknown';
      if (!acc[phone]) {
        acc[phone] = [];
      }
      acc[phone].push(template);
      return acc;
    }, {});

    await connection.end();

    return new Response(JSON.stringify({
      success: true,
      storeId: storeId,
      currentStorePhoneNumber: currentStorePhoneNumber,
      requestedPhone: phonenumber || 'current store phone',
      totalTemplates: results.length,
      templatesGroupedByPhone: groupedResults,
      templates: results // Keep flat structure for backward compatibility
    }), {
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