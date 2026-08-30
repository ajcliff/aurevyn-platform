import { createClient } from "@/lib/supabase";

/* =========================================================
   TYPES (STRICT - NO ANY)
========================================================= */

export type OpsTeam = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  color: string;
  lead: string | null;
  member_count: number;
  created_at: string;
};

export type OpsProject = {
  id: string;
  org_id: string;
  team_id: string | null;
  name: string;
  description: string | null;
  status: "active" | "completed" | "on_hold" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  progress: number;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
};

export type OpsTask = {
  id: string;
  org_id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  assignee: string | null;
  due_date: string | null;
  created_at: string;
};

export type OpsDocument = {
  id: string;
  org_id: string;
  project_id: string | null;
  name: string;
  type: "document" | "spreadsheet" | "presentation" | "pdf" | "other";
  size: string | null;
  url: string | null;
  uploaded_by: string;
  created_at: string;
};

/* =========================================================
   CLIENT
========================================================= */

const supabase = createClient();

/* =========================================================
   TEAMS
========================================================= */

export async function getTeams(orgId: string): Promise<OpsTeam[]> {
  const { data, error } = await supabase
    .from("ops_teams")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createTeam(
  team: Omit<OpsTeam, "id" | "created_at">
): Promise<OpsTeam> {
  const { data, error } = await supabase
    .from("ops_teams")
    .insert(team)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/* =========================================================
   PROJECTS
========================================================= */

export async function getProjects(orgId: string): Promise<OpsProject[]> {
  const { data, error } = await supabase
    .from("ops_projects")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createProject(
  project: Omit<OpsProject, "id" | "created_at">
): Promise<OpsProject> {
  const { data, error } = await supabase
    .from("ops_projects")
    .insert(project)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateProject(
  id: string,
  updates: Partial<Omit<OpsProject, "id" | "org_id" | "created_at">>
): Promise<OpsProject> {
  const { data, error } = await supabase
    .from("ops_projects")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/* =========================================================
   TASKS
========================================================= */

export async function getTasks(
  orgId: string,
  projectId?: string
): Promise<OpsTask[]> {
  let query = supabase
    .from("ops_tasks")
    .select("*")
    .eq("org_id", orgId);

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query.order("created_at", {
    ascending: true,
  });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createTask(
  task: Omit<OpsTask, "id" | "created_at">
): Promise<OpsTask> {
  const { data, error } = await supabase
    .from("ops_tasks")
    .insert(task)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateTask(
  id: string,
  updates: Partial<Omit<OpsTask, "id" | "org_id" | "created_at">>
): Promise<OpsTask> {
  const { data, error } = await supabase
    .from("ops_tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/* =========================================================
   DOCUMENTS
========================================================= */

export async function getDocuments(
  orgId: string,
  projectId?: string
): Promise<OpsDocument[]> {
  let query = supabase
    .from("ops_documents")
    .select("*")
    .eq("org_id", orgId);

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createDocument(
  doc: Omit<OpsDocument, "id" | "created_at">
): Promise<OpsDocument> {
  const { data, error } = await supabase
    .from("ops_documents")
    .insert(doc)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}