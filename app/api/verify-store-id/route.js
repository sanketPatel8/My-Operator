import { connectDB } from "@/lib/db";

export async function POST(req) {
  try {
    const body = await req.json();
    const { accessToken, company_id } = body;

    if (!accessToken || !company_id) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing fields" }),
        { status: 400 }
      );
    }

    const connection = await connectDB();

    // Check if accessToken exists
    const [rows] = await connection.query(
      "SELECT id, company_id FROM stores WHERE access_token = ?",
      [accessToken]
    );

    if (rows.length > 0) {
      const store = rows[0];

      // If company_id is already set (not null), return error
      if (store.company_id !== null) {
        connection.release();
        return new Response(
          JSON.stringify({
            success: false,
            message: "Company already registered",
          }),
          { status: 200 }
        );
      }

      // If company_id is null, update it
      await connection.query("UPDATE stores SET company_id = ? WHERE id = ?", [
        company_id,
        store.id,
      ]);

      connection.release();
      return new Response(
        JSON.stringify({
          success: true,
          message: "Company ID updated successfully",
        }),
        { status: 200 }
      );
    }

    connection.release();
    return new Response(
      JSON.stringify({
        success: false,
        message: "No store found for this access token",
      }),
      { status: 404 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    );
  }
}
