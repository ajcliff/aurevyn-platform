import { createClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

export type ArticleCategory = "sop" | "policy" | "onboarding" | "faq" | "general";

export type KnowledgeArticle = {
  id: string;
  org_id: string;
  title: string;
  category: ArticleCategory;
  content: string;
  created_by_name: string | null;
  updated_at: string;
  created_at: string;
};

export async function getArticles(orgId: string): Promise<KnowledgeArticle[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("knowledge_articles")
    .select("*")
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createArticle(input: {
  orgId: string;
  title: string;
  category: ArticleCategory;
  content: string;
  createdByName: string;
}): Promise<KnowledgeArticle> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("knowledge_articles")
    .insert({
      org_id: input.orgId,
      title: input.title,
      category: input.category,
      content: input.content,
      created_by_name: input.createdByName,
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    icon: "📚",
    title: "Knowledge article created",
    sub: input.title,
    org_id: input.orgId,
  });

  return data;
}

export async function updateArticle(
  id: string,
  title: string,
  category: ArticleCategory,
  content: string,
  orgId: string
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("knowledge_articles")
    .update({ title, category, content, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;

  await logActivity({
    icon: "✏️",
    title: "Knowledge article updated",
    sub: title,
    org_id: orgId,
  });
}

export async function deleteArticle(id: string, title: string, orgId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("knowledge_articles").delete().eq("id", id);
  if (error) throw error;

  await logActivity({
    icon: "🗑️",
    title: "Knowledge article deleted",
    sub: title,
    org_id: orgId,
  });
}