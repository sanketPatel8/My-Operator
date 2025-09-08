import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
 
// Load public key from environment variable
const publicKey = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, "\n");
 
export async function POST(req) {
  try {
    const { token } = await req.json();
 
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
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