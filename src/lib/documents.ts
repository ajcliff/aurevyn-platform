import { createClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { createApprovalRequest } from "@/lib/approvals";

export type DocumentCategory = "receipt" | "invoice" | "contract" | "hr" | "report" | "purchase_order" | "other";
export type DocumentStatus = "active" | "archived";

export type Document = {
  id: string;
  org_id: string;
  name: string;
  category: DocumentCategory;
  file_path: string;
  file_size: number | null;
  uploaded_by_name: string | null;
  status: DocumentStatus;
  visibility?: "org" | "restricted";
  created_by?: string | null;
  archived_at: string | null;
  archive_expires_at: string | null;
  created_at: string;
};

const ARCHIVE_RETENTION_DAYS = 90;

export async function getDocuments(orgId: string): Promise<Document[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getArchivedDocuments(orgId: string): Promise<Document[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "archived")
    .order("archived_at", { ascending: false });

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
    .createSignedUrl(path, 300);

  if (error) {
    console.error("Failed to create signed URL:", error);
    return null;
  }

  return data.signedUrl;
}

// Documents can no longer be deleted directly — the "documents" table has no
// DELETE policy for org members at all. This creates an approval request
// instead; nothing is removed or even archived until someone with approval
// rights decides on it.
export async function requestDocumentDeletion(
  doc: Document,
  orgId: string,
  requestedByUserId: string | null,
  requestedByName: string
) {
  await createApprovalRequest({
    orgId,
    requestedByUserId,
    requestedByName,
    type: "document_deletion",
    title: `Delete "${doc.name}"`,
    description: `Requested deletion of ${doc.name} (${doc.category}). Once approved, this file moves to Archive for ${ARCHIVE_RETENTION_DAYS} days before being permanently removed.`,
    amount: null,
    source: "document_deletion",
    relatedId: doc.id,
  });
}

// Called by the approvals page when a document_deletion request is approved.
// This only archives the document — it is never a hard delete. Permanent
// removal happens automatically, later, once archive_expires_at passes.
export async function archiveDocumentOnApproval(documentId: string, orgId: string) {
  const supabase = createClient();
  const archivedAt = new Date();
  const expiresAt = new Date(archivedAt);
  expiresAt.setDate(expiresAt.getDate() + ARCHIVE_RETENTION_DAYS);

  const { data, error } = await supabase
    .from("documents")
    .update({
      status: "archived",
      archived_at: archivedAt.toISOString(),
      archive_expires_at: expiresAt.toISOString(),
    })
    .eq("id", documentId)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    icon: "🗄️",
    title: "Document archived",
    sub: `${data.name} — permanently removed after ${ARCHIVE_RETENTION_DAYS} days unless restored`,
    org_id: orgId,
  });

  return data as Document;
}

export async function restoreDocument(id: string, orgId: string, name: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("documents")
    .update({ status: "active", archived_at: null, archive_expires_at: null })
    .eq("id", id);

  if (error) throw error;

  await logActivity({
    icon: "♻️",
    title: "Document restored",
    sub: name,
    org_id: orgId,
  });
}