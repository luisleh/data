import { NextRequest } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Team guidelines. Versioned: every save INSERTS a new row; the
 * latest row is the active version. Admin role is verified from
 * the database, never trusted from the client.
 */

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: "No autorizado" }, { status: 403 });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("manager_guidelines")
    .select("id, content, updated_at, updated_by, profiles:updated_by(full_name)")
    .order("updated_at", { ascending: false })
    .limit(10);

  if (error) return Response.json({ error: "Error al leer lineamientos" }, { status: 500 });

  return Response.json({
    current: data?.[0] ?? null,
    history: data ?? [],
  });
}

const putSchema = z.object({
  content: z.string().trim().min(1).max(20000),
});

export async function PUT(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: "No autorizado" }, { status: 403 });

  const parsed = putSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Contenido inválido" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("manager_guidelines")
    .insert({ content: parsed.data.content, updated_by: admin.id })
    .select("id, content, updated_at")
    .single();

  if (error) return Response.json({ error: "No se pudo guardar" }, { status: 500 });
  return Response.json({ saved: data });
}
