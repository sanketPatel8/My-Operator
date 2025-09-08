import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

// Load the public key (stored locally in /keys/public-key.pem)
const publicKey = fs.readFileSync(
  path.join(process.cwd(), "/lib/key.pem"),
  "utf8"
);

export async function POST(req) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Verify token
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ["RS256"],
    });

    return NextResponse.json({
      message: "Token is valid",
      companyId: decoded.company?.id,
      issuedAt: new Date(decoded.iat * 1000),
      expiresAt: new Date(decoded.exp * 1000),
      payload: decoded,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Token validation failed", details: error.message },
      { status: 401 }
    );
  }
}
