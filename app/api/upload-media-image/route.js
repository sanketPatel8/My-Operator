import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const form = await req.formData();
    const temp_id = form.get("temp_id"); // template ID
    const fileData = form.get("file");

    const [rows] = await pool.query(
      `SELECT tv.*, s.* 
   FROM template_variable tv
   JOIN stores s ON tv.store_id = s.id
   WHERE tv.template_data_id = ?`,
      [temp_id]
    );

    const variable = rows[0];

    console.log(variable, "rows");

    const { company_id, whatsapp_api_key } = variable;

    if (company_id !== null && whatsapp_api_key !== null) {
      // 🔹 Step 1: Upload file to external API
      const formData = new FormData();
      formData.append("file", fileData); // Adjust key if API expects different name
      formData.append("application", "template"); // Adjust key if API expects different name

      const uploadRes = await fetch(
        `${process.env.NEXT_PUBLIC_STAGE_LINK}/chat/media/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${whatsapp_api_key}`,
            "X-MYOP-COMPANY-ID": company_id,
          },
          body: formData,
        }
      );

      console.log(uploadRes, "uploadRes");

      if (!uploadRes.ok) {
        throw new Error(`Upload API failed: ${uploadRes.statusText}`);
      }

      const uploadResult = await uploadRes.json();
      const file_name = uploadResult?.data?.media_id;

      if (!file_name) {
        return NextResponse.json(
          {
            success: false,
            message: "Upload API did not return file name",
          },
          { status: 500 }
        );
      }

      if (rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Template does not exist",
          },
          { status: 404 }
        );
      }

      // ✏️ Step 3: Update template with uploaded file name
      await pool.query(
        `UPDATE template_variable
       SET tamplate_image = ?
       WHERE template_data_id = ?`,
        [file_name, temp_id]
      );

      return NextResponse.json(
        {
          success: true,
          message: "Media uploaded successfully",
          updatedData: {
            template_data_id: temp_id,
            tamplate_image: file_name,
          },
          //   variable,
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          success: true,
          message: "Media uploaded successfully",
          // updatedData: {
          //   template_data_id: temp_id,
          //   tamplate_image: file_name,
          // },
          variable,
        },
        { status: 200 }
      );
    }
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
