import { connectDB } from "@/lib/db";

export async function GET(req) {
  try {
    const connection = await connectDB();
    const [rows] = await connection.query("SELECT * from stores");
    connection.release();
    return new Response(JSON.stringify({ success: true, data: rows }), {
      status: 200,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 500,
      }
    );
  }
}
