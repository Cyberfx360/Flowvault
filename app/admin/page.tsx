import { notFound } from "next/navigation";
import { adminUser } from "@/lib/admin";
import AdminPanel from "./panel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Flowvault admin" };

// Only the emails in ADMIN_EMAILS get this page; everyone else sees "not found".
export default async function AdminPage() {
  if (!(await adminUser())) notFound();
  return <div className="shell"><AdminPanel /></div>;
}
