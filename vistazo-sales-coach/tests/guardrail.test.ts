import { describe, expect, it, vi } from "vitest";
import { classifyMessage, outOfScopeReply, NO_EVIDENCE_REPLY } from "@/lib/guardrail";
import { heuristicClassify, mentionsProductFacts } from "@/lib/guardrail/heuristics";
import type { GuardrailCategory, GuardrailClassifier } from "@/lib/ai/types";

function mockClassifier(category: GuardrailCategory): GuardrailClassifier {
  return { classify: vi.fn().mockResolvedValue(category) };
}

describe("heuristicClassify", () => {
  it("flags unambiguous out-of-scope messages without needing the LLM", () => {
    expect(heuristicClassify("¿Cómo hago pollo con papas?")).toBe("out_of_scope");
    expect(heuristicClassify("Contame un chiste")).toBe("out_of_scope");
    expect(heuristicClassify("¿Quién ganó el mundial?")).toBe("out_of_scope");
    expect(heuristicClassify("dame una receta de cocina fácil")).toBe("out_of_scope");
  });

  it("defers in-domain sales messages to the LLM (returns null)", () => {
    expect(heuristicClassify("Quiero practicar una objeción de precio")).toBeNull();
    expect(heuristicClassify("Mañana visito un hospital que usa Bayer")).toBeNull();
    expect(heuristicClassify("¿Qué osmolaridad tiene Visipaque?")).toBeNull();
  });

  it("defers ambiguous messages to the LLM", () => {
    expect(heuristicClassify("¿Me ayudás con algo?")).toBeNull();
  });

  it("does not confuse sales language with out-of-scope keywords", () => {
    // "ganó/gano" appears in sports patterns but must not trip here
    expect(heuristicClassify("¿Cómo le gano una licitación a la competencia?")).toBeNull();
  });
});

describe("classifyMessage (guardrail orchestration)", () => {
  it("short-circuits on heuristic out-of-scope: the LLM is never called", async () => {
    const classifier = mockClassifier("commercial_coaching");
    const result = await classifyMessage("¿Cómo hago pollo con papas?", classifier);
    expect(result.category).toBe("out_of_scope");
    expect(result.decidedBy).toBe("heuristic");
    expect(classifier.classify).not.toHaveBeenCalled();
  });

  it("delegates to the LLM when heuristics are not confident", async () => {
    const classifier = mockClassifier("commercial_coaching");
    const result = await classifyMessage("Quiero practicar una objeción", classifier);
    expect(result.category).toBe("commercial_coaching");
    expect(result.decidedBy).toBe("llm");
    expect(classifier.classify).toHaveBeenCalledOnce();
  });

  it("passes recent history so role-play turns stay in scope", async () => {
    const classifier = mockClassifier("commercial_coaching");
    await classifyMessage("Es muy caro, no me interesa", classifier, {
      recentHistory: ["Coach (como comprador): ¿Por qué debería cambiar de proveedor?"],
    });
    expect(classifier.classify).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Es muy caro, no me interesa",
        recentHistory: expect.arrayContaining([expect.stringContaining("comprador")]),
      }),
    );
  });

  it("propagates every category the LLM can return", async () => {
    for (const category of [
      "commercial_coaching",
      "product_question",
      "professional_context",
      "out_of_scope",
    ] as const) {
      const result = await classifyMessage("mensaje ambiguo", mockClassifier(category));
      expect(result.category).toBe(category);
    }
  });
});

describe("canned replies", () => {
  it("out-of-scope reply redirects to coaching", () => {
    const reply = outOfScopeReply();
    expect(reply).toContain("fuera de mi función");
    expect(reply).toContain("coach comercial de Vistazo");
  });

  it("no-evidence reply matches the exact required wording", () => {
    expect(NO_EVIDENCE_REPLY).toBe(
      "No encuentro información suficiente en la biblioteca aprobada para respaldar esa respuesta.",
    );
  });
});

describe("mentionsProductFacts", () => {
  it("detects technical/product content that requires the library", () => {
    expect(mentionsProductFacts("¿Qué osmolaridad tiene este contraste?")).toBe(true);
    expect(mentionsProductFacts("¿Cuál es la dosis recomendada?")).toBe(true);
    expect(mentionsProductFacts("¿Hay estudios que comparen Visipaque?")).toBe(true);
  });

  it("ignores pure coaching content", () => {
    expect(mentionsProductFacts("Ayudame a preparar la apertura de la visita")).toBe(false);
  });
});
