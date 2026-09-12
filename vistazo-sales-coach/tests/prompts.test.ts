import { describe, expect, it } from "vitest";
import { buildSystemPrompt, buildVoiceInstructions } from "@/lib/coach/prompts";
import { NO_EVIDENCE_REPLY } from "@/lib/guardrail";
import type { RetrievedChunk } from "@/lib/rag/retrieve";

const sampleChunk: RetrievedChunk = {
  chunkId: "c1",
  documentId: "d1",
  content: "Omnipaque 350 contiene iohexol equivalente a 350 mg de yodo por ml.",
  chunkIndex: 0,
  similarity: 0.82,
  documentTitle: "Ficha técnica Omnipaque",
  documentProduct: "Omnipaque",
  documentVersion: "3.0",
  documentSource: "GE HealthCare",
};

describe("buildSystemPrompt", () => {
  it("always includes the domain identity and the two-content-types rule", () => {
    const prompt = buildSystemPrompt({
      guidelines: null,
      mode: "general",
      chunks: [],
      isProductQuestion: false,
    });
    expect(prompt).toContain("Vistazo Sales Coach");
    expect(prompt).toContain("NO sos un asistente de propósito general");
    expect(prompt).toContain(NO_EVIDENCE_REPLY);
  });

  it("injects the admin guidelines when present", () => {
    const prompt = buildSystemPrompt({
      guidelines: "Priorizar preguntas abiertas. No hablar de precio de entrada.",
      mode: "general",
      chunks: [],
      isProductQuestion: false,
    });
    expect(prompt).toContain("LINEAMIENTOS COMERCIALES DEL EQUIPO");
    expect(prompt).toContain("Priorizar preguntas abiertas");
  });

  it("omits the guidelines block when there are none", () => {
    const prompt = buildSystemPrompt({
      guidelines: "   ",
      mode: "general",
      chunks: [],
      isProductQuestion: false,
    });
    expect(prompt).not.toContain("LINEAMIENTOS COMERCIALES DEL EQUIPO");
  });

  it("adds mode instructions for each coaching mode", () => {
    const visitPrep = buildSystemPrompt({
      guidelines: null,
      mode: "visit_prep",
      chunks: [],
      isProductQuestion: false,
    });
    expect(visitPrep).toContain("Preparación de visita");
    expect(visitPrep).toContain("objetivo concreto");

    const roleplay = buildSystemPrompt({
      guidelines: null,
      mode: "roleplay",
      chunks: [],
      isProductQuestion: false,
    });
    expect(roleplay).toContain("Role-play");
  });

  it("embeds retrieved evidence with document titles", () => {
    const prompt = buildSystemPrompt({
      guidelines: null,
      mode: "product",
      chunks: [sampleChunk],
      isProductQuestion: true,
    });
    expect(prompt).toContain("BIBLIOTECA APROBADA");
    expect(prompt).toContain("Ficha técnica Omnipaque");
    expect(prompt).toContain("iohexol");
    expect(prompt).toContain("versión 3.0");
  });

  it("instructs the exact no-evidence reply when a product question has no chunks", () => {
    const prompt = buildSystemPrompt({
      guidelines: null,
      mode: "product",
      chunks: [],
      isProductQuestion: true,
    });
    expect(prompt).toContain("no se encontraron extractos relevantes");
    expect(prompt).toContain(NO_EVIDENCE_REPLY);
  });
});

describe("buildVoiceInstructions", () => {
  it("keeps the same domain rules and adds the search_library tool contract", () => {
    const instructions = buildVoiceInstructions({
      guidelines: "Vender consultivamente.",
      mode: "objections",
      historySummary: "Vendedor: Mañana visito un centro que usa Bayer.",
    });
    expect(instructions).toContain("Vistazo Sales Coach");
    expect(instructions).toContain("search_library");
    expect(instructions).toContain(NO_EVIDENCE_REPLY);
    expect(instructions).toContain("Vender consultivamente.");
    expect(instructions).toContain("CONTEXTO PREVIO");
    expect(instructions).toContain("centro que usa Bayer");
  });

  it("works without history (fresh voice conversation)", () => {
    const instructions = buildVoiceInstructions({
      guidelines: null,
      mode: "general",
      historySummary: null,
    });
    expect(instructions).not.toContain("CONTEXTO PREVIO");
  });
});
