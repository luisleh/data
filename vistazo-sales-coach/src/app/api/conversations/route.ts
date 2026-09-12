import { getAuthenticatedUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Lists the caller's own conversations (RLS enforces ownership). */
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, mode, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) return Response.json({ error: "Error al listar" }, { status: 500 });
  return Response.json({ conversations: data });
}
