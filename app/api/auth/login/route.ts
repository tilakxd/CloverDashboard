import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyPassword, getDashboardPassword, hashPassword, createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    // Get the stored password from environment
    const storedPassword = getDashboardPassword();
    
    // For first-time setup, if password is not hashed, hash it and compare
    // Otherwise, verify against stored hash
    let isValid = false;
    
    // Check if stored password is already hashed (starts with $2a$ or $2b$)
    if (storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$")) {
      // Password is hashed, use bcrypt compare
      isValid = await verifyPassword(password, storedPassword);
    } else {
      // Password is plain text (first time), compare directly
      // Then hash it for future use (user should update .env)
      isValid = password === storedPassword;
    }

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    // Create session
    const sessionToken = createSession();
    const cookieStore = await cookies();
    
    // Check if request is over HTTPS
    const isSecure = request.url.startsWith("https://") || 
                     request.headers.get("x-forwarded-proto") === "https";
    
    // Set session cookie (24 hours)
    cookieStore.set("clover-dashboard-session", sessionToken, {
      httpOnly: true,
      secure: isSecure, // Only use secure cookies over HTTPS
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

