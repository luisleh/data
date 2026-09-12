import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * Reads the current (latest) team guidelines. Server-side via the
 * service role because sellers cannot read the table directly,
 * yet the guidelines must shape every seller conversation.
 */
export async function getCurrentGuidelines(): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("manager_guidelines")
    .select("content")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error("guidelines: read failed", { error: error.message });
    return null;
  }
  return data?.content ?? null;
}
