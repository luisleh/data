import { NextRequest } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const idSchema = z.string().uuid();

/**
 * PATCH: activate/deactivate a document (retiring an obsolete
 * version without deleting it) or edit its metadata.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  if (!idSchema.safeParse(id).success) {
    return Response.json({ error: "ID inválido" }, { status: 400 });
  }

  const bodySchema = z.object({
    active: z.boolean().optional(),
    title: z.string().trim().min(1).max(300).optional(),
    product: z.string().trim().max(200).nullable().optional(),
    document_type: z.string().trim().max(100).nullable().optional(),
    country: z.string().trim().max(100).nullable().optional(),
    language: z.string().trim().max(20).nullable().optional(),
    version: z.string().trim().max(50).nullable().optional(),
    effective_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    source: z.string().trim().max(200).nullable().optional(),
  });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("knowledge_documents")
    .update(parsed.data)
    .eq("id", id)
    .select("id, title, active")
    .single();

  if (error) return Response.json({ error: "No se pudo actualizar" }, { status: 500 });
  return Response.json({ document: data });
}

/** DELETE: permanently removes the document, its chunks and the file. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  if (!idSchema.safeParse(id).success) {
    return Response.json({ error: "ID inválido" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: doc } = await supabase
    .from("knowledge_documents")
    .select("storage_path")
    .eq("id", id)
    .single();
  if (!doc) return Response.json({ error: "Documento no encontrado" }, { status: 404 });

  // Chunks cascade via FK; remove the stored file too.
  const { error } = await supabase.from("knowledge_documents").delete().eq("id", id);
  if (error) {
    logger.error("documents: delete failed", { error: error.message });
    return Response.json({ error: "No se pudo borrar" }, { status: 500 });
  }
  await supabase.storage.from("knowledge").remove([doc.storage_path]);

  return Response.json({ deleted: true });
}
