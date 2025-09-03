import mysql from "mysql2/promise";
import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const SECRET_KEY = Buffer.from(process.env.SECRET_KEY, "hex"); // 32 bytes

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(text.toString());
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}



// 🔹 GET: find store by shop → return encrypted id
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const shop = searchParams.get("shop");

    if (!shop) {
      return new Response(JSON.stringify({ message: "Missing shop param" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    });

    const [rows] = await connection.execute(
      "SELECT id FROM stores WHERE shop = ?",
      [shop]
    );

    await connection.end();

    if (rows.length === 0) {
      return new Response(JSON.stringify({ message: "Shop not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const encryptedId = encrypt(rows[0].id);

    return new Response(JSON.stringify({ encryptedId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) { 
    console.error("Encrypt error:", error);
    return new Response(
      JSON.stringify({ message: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}


