import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const { id } = body;

    // 1️⃣ Pela check karo ke id exist che ke nai
    const [checkRows] = await pool.query(
      `SELECT template_data_id FROM template_variable WHERE template_variable_id = ?`,
      [id]
    );

    if (checkRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No record found for this template_variable_id",
        },
        { status: 404 }
      );
    }

    const templateDataId = checkRows[0].template_data_id;

    // 2️⃣ Jo record male to update karo
    await pool.query(
      `UPDATE template_variable SET tamplate_image = NULL WHERE template_data_id = ?`,
      [templateDataId]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Deleted uploaded successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/update-template error:", error);
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
