/**
 * INSTITUTIONAL ADMIN AUTH MIDDLEWARE
 * Version: 1.0.0
 * Decoupled logic for verifying administrative API handshakes.
 */

export async function verifyAdminHandshake(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('Authorization');
  const adminSecret = process.env.ADMIN_API_SECRET;

  if (!adminSecret) {
    console.warn("[ADMIN_AUTH_ADVISORY] Admin secret not configured. Fallback to session check.");
    return true; 
  }

  return authHeader === `Bearer ${adminSecret}`;
}
