import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(req) {
  try {
    const { name } = await req.json();

    console.log("✅ Customers received from Remix:", name);

    const [rows] = await pool.query(
      `SELECT work_flow_note FROM workflow_notes WHERE work_flow_name = ?`,
      [name]
    );

    console.log(rows, "rows");

    return NextResponse.json({
      status: "success",
      data: rows[0],
    });
  } catch (err) {
    console.error("❌ Error receiving customers:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
