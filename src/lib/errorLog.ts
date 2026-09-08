import { createClient } from "./supabase";

export type ErrorLogEntry = {
  id: string;
  org_id: string | null;
  source: string;
  message: string;
  code: string | null;
  context: Record<string, unknown> | null;
  severity: "info" | "error" | "critical";
  created_at: string;
};

export async function logError(params: {
  source: string;
  message: string;
  code?: string | null;
  orgId?: string | null;
  context?: Record<string, unknown> | null;
  severity?: "info" | "error" | "critical";
}): Promise<void> {
  const severity = params.severity ?? "error";
  try {
    const supabase = createClient();
    await supabase.from("error_logs").insert({
      source: params.source,
      message: params.message,
      code: params.code ?? null,
      org_id: params.orgId ?? null,
      context: params.context ?? null,
      severity,
    });
  } catch (err) {
    // Logging must never itself break the page.
    console.error("Failed to write error log:", err);
  }

  if (severity === "critical") {
    // Fire-and-forget - a failed alert email should never block the caller.
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "critical_error",
        source: params.source,
        message: params.message,
        orgId: params.orgId ?? null,
      }),
    }).catch(() => {});
  }
}

export async function getErrorLogs(limit = 200): Promise<ErrorLogEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("error_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching error logs:", error);
    return [];
  }

  return data as ErrorLogEntry[];
}

export async function deleteErrorLog(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("error_logs").delete().eq("id", id);

  if (error) {
    console.error("Error deleting error log:", error);
    return false;
  }

  return true;
}

export async function clearErrorLogs(): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("error_logs")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) {
    console.error("Error clearing error logs:", error);
    return false;
  }

  return true;
}