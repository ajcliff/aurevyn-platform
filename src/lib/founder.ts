// Founder identity. The source of truth is the founder_settings table: a user is the
// founder if they have a row there (RLS only lets the founder read it, so everyone
// else simply gets no row back). NEXT_PUBLIC_FOUNDER_EMAIL stays as a fallback so a
// transient database error never locks the founder out.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any };
type UserLike = { id: string; email?: string | null };

export async function isFounderUser(supabase: SupabaseLike, user: UserLike | null | undefined): Promise<boolean> {
  if (!user) return false;
  try {
    const { data } = await supabase.from("founder_settings").select("user_id").eq("user_id", user.id).maybeSingle();
    if (data?.user_id) return true;
  } catch {
    // fall through to the env fallback
  }
  const envEmail = process.env.NEXT_PUBLIC_FOUNDER_EMAIL?.trim().toLowerCase();
  return !!envEmail && !!user.email && user.email.trim().toLowerCase() === envEmail;
}
