import { createClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

export type DocumentCategory = "receipt" | "invoice" | "contract" | "hr" | "report" | "purchase_order" | "other";

export type Document = {
  id: string;
  org_id: string;
  name: string;
  category: DocumentCategory;
  file_path: string;
  file_size: number | null;
  uploaded_by_name: string | null;
  created_at: string;
};

export async function getDocuments(orgId: string): Promise<Document[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function uploadDocument(
  orgId: string,
  file: File,
  category: DocumentCategory,
  uploadedByName: string
): Promise<Document> {
  const supabase = createClient();

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${orgId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, file);

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("documents")
    .insert({
      org_id: orgId,
      name: file.name,
      category,
      file_path: path,
      file_size: file.size,
      uploaded_by_name: uploadedByName,
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    icon: "📄",
    title: "Document uploaded",
    sub: `${file.name} (${category})`,
    org_id: orgId,
  });

  return data;
}

export async function getSignedDocumentUrl(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(path, 300); // link expires in 5 minutes

  if (error) {
    console.error("Failed to create signed URL:", error);
    return null;
  }

  return data.signedUrl;
}

export async function deleteDocument(id: string, filePath: string, orgId: string, name: string) {
  const supabase = createClient();

  await supabase.storage.from("documents").remove([filePath]);

  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw error;

  await logActivity({
    icon: "🗑️",
    title: "Document deleted",
    sub: name,
    org_id: orgId,
  });
}