"use client";

import { useEffect, useState } from "react";

interface GuidelineVersion {
  id: string;
  content: string;
  updated_at: string;
  profiles?: { full_name: string } | null;
}

/**
 * Edits the team guidelines. Saving creates a NEW version (the
 * table is append-only), effective immediately for every new
 * coach interaction — no redeploy needed.
 */
export function GuidelinesEditor() {
  const [content, setContent] = useState("");
  const [current, setCurrent] = useState<GuidelineVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/admin/guidelines");
        if (response.ok) {
          const data = (await response.json()) as { current: GuidelineVersion | null };
          if (data.current) {
            setCurrent(data.current);
            setContent(data.current.content);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/guidelines", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "No se pudo guardar");
        return;
      }
      const data = (await response.json()) as { saved: GuidelineVersion };
      setCurrent(data.saved);
      setNotice("Lineamientos guardados. Aplican a las próximas interacciones del coach.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="card">Cargando…</div>;

  return (
    <div className="card">
      {notice && <div className="form-success">{notice}</div>}
      {error && <div className="form-error">{error}</div>}
      <div className="field">
        <label htmlFor="guidelines">
          Estas instrucciones globales guían al coach en todas las conversaciones del equipo
        </label>
        <textarea
          id="guidelines"
          rows={10}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Ej.: Queremos vendedores consultivos. Antes de hablar de precio buscamos entender necesidades, producto utilizado actualmente, volumen y decisores…"
        />
      </div>
      <button className="btn btn-primary" onClick={handleSave} disabled={saving || !content.trim()}>
        {saving ? "Guardando…" : "Guardar lineamientos"}
      </button>
      {current && (
        <p className="meta-line">
          Última actualización: {new Date(current.updated_at).toLocaleString("es-AR")}
          {current.profiles?.full_name ? ` por ${current.profiles.full_name}` : ""}
        </p>
      )}
    </div>
  );
}
