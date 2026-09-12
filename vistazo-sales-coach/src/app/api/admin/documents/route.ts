import { NextRequest } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestDocument } from "@/lib/rag/ingest";
import { logger } from "@/lib/logger";

export const maxDuration = 300; // ingestion of large PDFs

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

/** Lists all library documents (admin only). */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: "No autorizado" }, { status: 403 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("knowledge_documents")
    .select(
      "id, title, product, document_type, country, language, version, effective_date, source, active, status, status_detail, chunk_count, file_name, file_size, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: "Error al listar documentos" }, { status: 500 });
  return Response.json({ documents: data });
}

const metadataSchema = z.object({
  title: z.string().trim().min(1).max(300),
  product: z.string().trim().max(200).optional().or(z.literal("")),
  document_type: z.string().trim().max(100).optional().or(z.literal("")),
  country: z.string().trim().max(100).optional().or(z.literal("")),
  language: z.string().trim().max(20).optional().or(z.literal("")),
  version: z.string().trim().max(50).optional().or(z.literal("")),
  effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  source: z.string().trim().max(200).optional().or(z.literal("")),
});

/**
 * Uploads a PDF + metadata (multipart/form-data), stores it in the
 * private `knowledge` bucket and ingests it into the RAG index.
 */
export async function POST(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: "No autorizado" }, { status: 403 });

  const formData = await request.formData().catch(() => null);
  if (!formData) return Response.json({ error: "Formulario inválido" }, { status: 400 });

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Falta el archivo PDF" }, { status: 400 });
  }
  // File validation: type, extension and size.
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return Response.json({ error: "Solo se admiten archivos PDF" }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: `El archivo debe pesar entre 1 byte y ${MAX_FILE_SIZE / 1024 / 1024} MB` },
      { status: 400 },
    );
  }

  const metadata = metadataSchema.safeParse({
    title: formData.get("title") ?? "",
    product: formData.get("product") ?? "",
    document_type: formData.get("document_type") ?? "",
    country: formData.get("country") ?? "",
    language: formData.get("language") ?? "",
    version: formData.get("version") ?? "",
    effective_date: formData.get("effective_date") ?? "",
    source: formData.get("source") ?? "",
  });
  if (!metadata.success) {
    return Response.json({ error: "Metadata inválida" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${crypto.randomUUID()}/${safeName}`;

  const buffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("knowledge")
    .upload(storagePath, buffer, { contentType: "application/pdf" });
  if (uploadError) {
    logger.error("documents: upload failed", { error: uploadError.message });
    return Response.json({ error: "No se pudo subir el archivo" }, { status: 500 });
  }

  const m = metadata.data;
  const { data: doc, error: insertError } = await supabase
    .from("knowledge_documents")
    .insert({
      title: m.title,
      product: m.product || null,
      document_type: m.document_type || null,
      country: m.country || null,
      language: m.language || "es",
      version: m.version || null,
      effective_date: m.effective_date || null,
      source: m.source || null,
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      status: "processing",
      created_by: admin.id,
    })
    .select("id")
    .single();

  if (insertError || !doc) {
    await supabase.storage.from("knowledge").remove([storagePath]);
    logger.error("documents: metadata insert failed", { error: insertError?.message });
    return Response.json({ error: "No se pudo registrar el documento" }, { status: 500 });
  }

  // Ingest synchronously: on Vercel, work after the response isn't
  // guaranteed to run. Uploads are an infrequent admin action.
  await ingestDocument(doc.id, storagePath);

  const { data: finalDoc } = await supabase
    .from("knowledge_documents")
    .select("id, title, status, status_detail, chunk_count")
    .eq("id", doc.id)
    .single();

  return Response.json({ document: finalDoc });
}
