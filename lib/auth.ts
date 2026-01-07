import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

const SESSION_COOKIE_NAME = "clover-dashboard-session";
const SESSION_SECRET = process.env.SESSION_SECRET || "change-me-in-production";

/**
 * Verify password against the stored password hash
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    
    if (!sessionCookie?.value) {
      return false;
    }

    // Verify session token (simple implementation)
    // In production, you might want to use JWT or store sessions in DB
    const sessionData = await verifySession(sessionCookie.value);
    return sessionData !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Create a session token
 */
export function createSession(): string {
  // Simple session token - in production, use JWT or proper session management
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const token = `${timestamp}-${random}`;
  
  // In a real app, you'd sign this with a secret
  return Buffer.from(token).toString("base64");
}

/**
 * Verify session token
 */
async function verifySession(token: string): Promise<{ valid: boolean } | null> {
  try {
    // Simple verification - decode and check format
    const decoded = Buffer.from(token, "base64").toString();
    const parts = decoded.split("-");
    
    if (parts.length !== 2) {
      return null;
    }

    // Check if session is not too old (24 hours)
    const timestamp = parseInt(parts[0], 10);
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (Date.now() - timestamp > maxAge) {
      return null;
    }

    return { valid: true };
  } catch (error) {
    return null;
  }
}

/**
 * Get the dashboard password from environment
 */
export function getDashboardPassword(): string {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) {
    throw new Error("DASHBOARD_PASSWORD environment variable is not set");
  }
  return password;
}

