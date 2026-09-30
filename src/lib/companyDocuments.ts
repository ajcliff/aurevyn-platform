import { createClient } from "./supabase";

export type DocumentType = "registration" | "tax" | "licence" | "contract" | "policy" | "insurance" | "other";

export type CompanyDocument = {
  id: string;
  title: string;
  doc_type: DocumentType;
  reference: string | null;
  issued_on: string | null;
  expires_on: string | null;
  link: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyDocumentInput = {
  title: string;
  doc_type: DocumentType;
  reference?: string | null;
  issued_on?: string | null;
  expires_on?: string | null;
  link?: string | null;
  notes?: string | null;
};

export async function getCompanyDocuments(): Promise<CompanyDocument[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("company_documents")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as CompanyDocument[];
}

export async function createCompanyDocument(input: CompanyDocumentInput): Promise<CompanyDocument> {
  const supabase = createClient();
  const { data, error } = await supabase.from("company_documents").insert(input).select().single();
  if (error) throw error;
  return data as CompanyDocument;
}

export async function updateCompanyDocument(id: string, updates: Partial<CompanyDocumentInput>): Promise<CompanyDocument> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("company_documents")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as CompanyDocument;
}

export async function deleteCompanyDocument(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("company_documents").delete().eq("id", id);
  if (error) throw error;
}