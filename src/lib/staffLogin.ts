// Staff can sign in with a username instead of an email. Behind the scenes the sign-in system
// still needs an email-shaped identifier, so a username becomes jane.otieno@staff.aurevyn.invalid.
// That address never receives mail (".invalid" can't exist), and real contact emails are stored separately.
export const STAFF_DOMAIN = "staff.aurevyn.invalid";

export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,29}$/;

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

export function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@${STAFF_DOMAIN}`;
}

// What someone typed on the login screen: an email as-is, or a username turned into its sign-in address
export function loginIdentifierToEmail(input: string): string {
  const v = input.trim();
  return v.includes("@") ? v : usernameToEmail(v);
}

export function isStaffAuthEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(`@${STAFF_DOMAIN}`);
}
