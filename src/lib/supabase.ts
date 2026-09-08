import { createBrowserClient } from "@supabase/ssr";

const MOBILE_BREAKPOINT = 900;

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

const READ_ONLY_ERROR = {
  message: "This is a view-only screen on a small screen. Switch to a laptop or desktop to make changes.",
  details: "",
  hint: "",
  code: "MOBILE_READ_ONLY",
};

/**
 * A "poisoned" thenable that mimics Supabase's query builder chain shape.
 * Any method call on it (.eq, .select, .single, .order, etc.) returns another
 * instance of itself, so arbitrarily deep chaining after a blocked mutation
 * still resolves to the same read-only error the moment it's awaited —
 * matching Supabase's normal `{ data, error }` response contract exactly,
 * so existing `if (error)` handling across the app "just works" without
 * needing every call site to be touched individually.
 */
function createBlockedResult(): any {
  const promise = Promise.resolve({ data: null, error: READ_ONLY_ERROR });
  return new Proxy(promise, {
    get(target, prop, receiver) {
      if (prop in target) {
        const value = Reflect.get(target, prop, receiver);
        return typeof value === "function" ? value.bind(target) : value;
      }
      return () => createBlockedResult();
    },
  });
}

const MUTATING_METHODS = ["insert", "update", "upsert", "delete"] as const;

/**
 * By default, writes are blocked on mobile viewports everywhere (see
 * isMobileViewport above). Pass { allowMobileWrites: true } only for flows
 * that have their own deliberate mobile support built in (currently just
 * POS checkout, which queues sales offline and syncs them - see
 * src/lib/posOfflineQueue.ts). Every other call site should use the
 * default and stay locked.
 */
export function createClient(options?: { allowMobileWrites?: boolean }) {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const bypassMobileLock = options?.allowMobileWrites === true;

  const originalFrom = client.from.bind(client);

  client.from = ((table: string) => {
    const builder = originalFrom(table as any);
    if (bypassMobileLock || !isMobileViewport()) return builder;

    for (const method of MUTATING_METHODS) {
      (builder as any)[method] = () => createBlockedResult();
    }
    return builder;
  }) as typeof client.from;

  const originalStorageFrom = client.storage.from.bind(client.storage);
  const STORAGE_MUTATING_METHODS = ["upload", "update", "remove", "move", "copy"] as const;

  client.storage.from = ((bucket: string) => {
    const storageBuilder = originalStorageFrom(bucket);
    if (bypassMobileLock || !isMobileViewport()) return storageBuilder;

    for (const method of STORAGE_MUTATING_METHODS) {
      (storageBuilder as any)[method] = async () => ({ data: null, error: READ_ONLY_ERROR });
    }
    return storageBuilder;
  }) as typeof client.storage.from;

  return client;
}

export { isMobileViewport, MOBILE_BREAKPOINT };
