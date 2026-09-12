import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthenticatedUser } from "@/lib/auth";
import { GuidelinesEditor } from "@/components/admin/GuidelinesEditor";
import { DocumentsManager } from "@/components/admin/DocumentsManager";

export default async function AdminPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  // Role comes from the database — never from the client.
  if (user.role !== "admin") redirect("/coach");

  return (
    <>
      <header className="app-header">
        <div className="brand">
          <h1>Vistazo Sales Coach — Administración</h1>
          <p>Lineamientos del equipo y biblioteca aprobada</p>
        </div>
        <div className="header-actions">
          <Link href="/coach" className="btn btn-small">
            ← Volver al coach
          </Link>
        </div>
      </header>
      <div className="admin-wrap">
        <h2>Lineamientos comerciales del equipo</h2>
        <GuidelinesEditor />
        <h2>Biblioteca de documentos aprobados</h2>
        <DocumentsManager />
      </div>
    </>
  );
}
