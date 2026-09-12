"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface KnowledgeDocument {
  id: string;
  title: string;
  product: string | null;
  document_type: string | null;
  country: string | null;
  language: string | null;
  version: string | null;
  effective_date: string | null;
  source: string | null;
  active: boolean;
  status: "processing" | "ready" | "error";
  status_detail: string | null;
  chunk_count: number;
  file_name: string;
  created_at: string;
}

const DOCUMENT_TYPES = ["ficha_tecnica", "brochure", "paper", "estudio", "faq", "otro"];

/**
 * Approved-library admin: upload PDFs with metadata, list them,
 * activate/deactivate (retire obsolete versions without deleting)
 * and delete. Retrieval only ever uses ACTIVE documents.
 */
export function DocumentsManager() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/documents");
    if (response.ok) {
      const data = (await response.json()) as { documents: KnowledgeDocument[] };
      setDocuments(data.documents);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setUploading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const response = await fetch("/api/admin/documents", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => null)) as
        | { document?: { status: string; status_detail?: string | null }; error?: string }
        | null;
      if (!response.ok || !data?.document) {
        setError(data?.error ?? "No se pudo subir el documento");
        return;
      }
      if (data.document.status === "ready") {
        setNotice("Documento cargado e indexado. Ya está disponible para el coach.");
      } else {
        setError(
          `El documento se subió pero la indexación falló: ${data.document.status_detail ?? "error desconocido"}`,
        );
      }
      formRef.current?.reset();
      await load();
    } finally {
      setUploading(false);
    }
  }

  async function toggleActive(doc: KnowledgeDocument) {
    const response = await fetch(`/api/admin/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !doc.active }),
    });
    if (response.ok) await load();
  }

  async function handleDelete(doc: KnowledgeDocument) {
    if (
      !window.confirm(
        `¿Borrar definitivamente "${doc.title}"? Si es una versión vieja, conviene desactivarla en lugar de borrarla.`,
      )
    ) {
      return;
    }
    const response = await fetch(`/api/admin/documents/${doc.id}`, { method: "DELETE" });
    if (response.ok) await load();
  }

  return (
    <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Subir documento (PDF)</h3>
        {error && <div className="form-error">{error}</div>}
        {notice && <div className="form-success">{notice}</div>}
        <form ref={formRef} onSubmit={handleUpload}>
          <div className="field">
            <label htmlFor="file">Archivo PDF *</label>
            <input id="file" name="file" type="file" accept="application/pdf,.pdf" required />
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="title">Título *</label>
              <input id="title" name="title" type="text" required maxLength={300} />
            </div>
            <div className="field">
              <label htmlFor="product">Producto</label>
              <input id="product" name="product" type="text" placeholder="Ej.: Omnipaque" />
            </div>
            <div className="field">
              <label htmlFor="document_type">Tipo de documento</label>
              <select id="document_type" name="document_type" defaultValue="">
                <option value="">—</option>
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="country">País / región</label>
              <input id="country" name="country" type="text" placeholder="Ej.: Argentina" />
            </div>
            <div className="field">
              <label htmlFor="language">Idioma</label>
              <input id="language" name="language" type="text" defaultValue="es" />
            </div>
            <div className="field">
              <label htmlFor="version">Versión</label>
              <input id="version" name="version" type="text" placeholder="Ej.: 2.1" />
            </div>
            <div className="field">
              <label htmlFor="effective_date">Fecha de vigencia</label>
              <input id="effective_date" name="effective_date" type="date" />
            </div>
            <div className="field">
              <label htmlFor="source">Fuente</label>
              <input id="source" name="source" type="text" placeholder="Ej.: GE HealthCare" />
            </div>
          </div>
          <button className="btn btn-primary" disabled={uploading}>
            {uploading ? "Subiendo e indexando…" : "Subir a la biblioteca"}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Documentos ({documents.length})</h3>
        <div className="table-scroll">
          <table className="doc-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Versión</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <strong>{doc.title}</strong>
                    <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      {doc.file_name} · {doc.country ?? "—"} · {doc.language ?? "—"}
                      {doc.effective_date ? ` · vigente desde ${doc.effective_date}` : ""}
                      {doc.source ? ` · ${doc.source}` : ""}
                    </div>
                  </td>
                  <td>{doc.product ?? "—"}</td>
                  <td>{doc.document_type ?? "—"}</td>
                  <td>{doc.version ?? "—"}</td>
                  <td>
                    {doc.status === "error" ? (
                      <span className="badge error" title={doc.status_detail ?? ""}>
                        error
                      </span>
                    ) : doc.status === "processing" ? (
                      <span className="badge inactive">procesando</span>
                    ) : doc.active ? (
                      <span className="badge active">activo · {doc.chunk_count} chunks</span>
                    ) : (
                      <span className="badge inactive">inactivo</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button className="btn btn-small" onClick={() => void toggleActive(doc)}>
                        {doc.active ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        className="btn btn-small btn-danger"
                        onClick={() => void handleDelete(doc)}
                      >
                        Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {documents.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ color: "var(--text-muted)" }}>
                    Todavía no hay documentos. Subí el primero para habilitar las consultas de
                    producto con evidencia.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
