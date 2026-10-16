import { supabaseAdmin } from "@/lib/supabase/server";
import type { Attachment } from "@/lib/attachments";

// Turns the document ids a client sent into trusted {id, name} pairs: each must be an active document of this org.
export async function resolveAttachments(orgId: string, ids: unknown): Promise<Attachment[]> {
  const list = Array.isArray(ids) ? [...new Set(ids.filter((x): x is string => typeof x === "string"))].slice(0, 10) : [];
  if (list.length === 0) return [];
  const { data } = await supabaseAdmin.from("documents").select("id, name").eq("org_id", orgId).eq("status", "active").in("id", list);
  return (data ?? []).map(d => ({ documentId: d.id as string, name: d.name as string }));
}
