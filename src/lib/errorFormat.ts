// Turns any thrown value into a readable string that includes enough to
// diagnose the problem without needing terminal/log access — Supabase errors
// carry a `code` (e.g. "42703" = undefined column) that's genuinely useful
// for pinpointing what broke, so it's included whenever present.
export function formatError(err: unknown): string {
  if (!err) return "Something went wrong.";

  if (typeof err === "string") return err;

  if (err instanceof Error) return err.message;

  if (typeof err === "object") {
    const anyErr = err as any;
    const message = anyErr.message || anyErr.error_description || anyErr.details || "Something went wrong.";
    const code = anyErr.code;
    return code ? `${message} (code: ${code})` : message;
  }

  return String(err);
}