// After a new deploy, an open app (especially the desktop shell) still points at
// page files from the old build, which no longer exist. The fix is a reload.

export function isStaleChunkError(error: unknown): boolean {
  const text = `${(error as { name?: string })?.name ?? ""} ${(error as { message?: string })?.message ?? String(error ?? "")}`;
  return /ChunkLoadError|Failed to load chunk|Loading chunk .* failed|Loading CSS chunk|error loading dynamically imported module|Importing a module script failed/i.test(text);
}

const KEY = "aurevyn:chunk-reload-at";

// Reloads at most once a minute so a genuinely broken page can't loop.
// Returns true when a reload has been triggered.
export function autoReloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}
