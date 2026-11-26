import { redirect } from "next/navigation";

// Bookmarkable admin sign-in: the normal login, then straight back to /admin.
export default function AdminLogin() {
  redirect("/login?next=/admin");
}
