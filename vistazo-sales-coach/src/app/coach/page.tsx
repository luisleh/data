import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { CoachShell } from "@/components/coach/CoachShell";

export default async function CoachPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  return <CoachShell userName={user.fullName || user.email || ""} isAdmin={user.role === "admin"} />;
}
