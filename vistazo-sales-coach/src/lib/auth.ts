import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UserRole = "seller" | "admin";

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  fullName: string;
  role: UserRole;
}

/**
 * Resolves the authenticated user AND their role from the
 * database (`profiles`), never from anything the client sends.
 * Returns null when there is no valid session.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile.full_name ?? "",
    role: profile.role as UserRole,
  };
}

/** Like getAuthenticatedUser but requires the admin role. */
export async function getAdminUser(): Promise<AuthenticatedUser | null> {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "admin") return null;
  return user;
}
