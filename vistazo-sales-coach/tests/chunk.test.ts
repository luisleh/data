import { describe, expect, it } from "vitest";
import { chunkText, normalizeText } from "@/lib/rag/chunk";

describe("normalizeText", () => {
  it("collapses PDF whitespace noise", () => {
    expect(normalizeText("hola   mundo\r\n\r\n\r\n\r\nchau")).toBe("hola mundo\n\nchau");
  });
});

describe("chunkText", () => {
  it("returns empty for empty input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n  ")).toEqual([]);
  });

  it("returns a single chunk for short text", () => {
    const chunks = chunkText("Texto corto de ficha técnica.");
    expect(chunks).toHaveLength(1);
  });

  it("splits long text into overlapping chunks within the size limit", () => {
    const sentence = "Omnipaque es un medio de contraste yodado no iónico. ";
    const text = sentence.repeat(200); // ~10k chars
    const chunks = chunkText(text, { chunkSize: 1000, overlap: 150 });

    expect(chunks.length).toBeGreaterThan(5);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(1000);
      expect(chunk.trim().length).toBeGreaterThan(0);
    }
  });

  it("keeps all content (no text lost between chunks)", () => {
    const text = Array.from({ length: 80 }, (_, i) => `Dato clínico número ${i}.`).join(" ");
    const chunks = chunkText(text, { chunkSize: 300, overlap: 50 });
    for (let i = 0; i < 80; i++) {
      expect(chunks.some((c) => c.includes(`Dato clínico número ${i}.`))).toBe(true);
    }
  });

  it("prefers sentence boundaries", () => {
    const text = ("Primera oración con contenido. ".repeat(60)).trim();
    const chunks = chunkText(text, { chunkSize: 400, overlap: 50 });
    // Most chunks should end at a sentence boundary.
    const endingWithPeriod = chunks.filter((c) => c.endsWith(".")).length;
    expect(endingWithPeriod).toBeGreaterThanOrEqual(chunks.length - 1);
  });
});
