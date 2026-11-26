import "server-only";
import { userClient } from "./server-supabase";

/**
 * Who may open /admin: the login emails in ADMIN_EMAILS (Render > Environment), comma separated.
 * Nobody is an admin while it's empty.
 */
export async function adminUser() {
  const allowed = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!allowed.length) return null;
  const supabase = await userClient();
  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase();
  return email && allowed.includes(email) ? user : null;
}
