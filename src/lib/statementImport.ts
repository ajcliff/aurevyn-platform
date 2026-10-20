import { createClient } from "@/lib/supabase";
import { getAssetAccountId } from "@/lib/journal";

// Bank / M-Pesa statement import for reconciliation. Nothing is stored: the file is read in the browser,
// compared with what AUREVYN recorded for that account, and the differences are shown.

export type StatementLine = { date: string; description: string; amount: number; balance: number | null };
export type BookLine = { date: string; description: string; amount: number };
export type MatchResult = {
  matched: { statement: StatementLine; book: BookLine }[];
  statementOnly: StatementLine[]; // on the statement, not in AUREVYN
  bookOnly: BookLine[]; // in AUREVYN, not on the statement
};

// --- CSV reading -----------------------------------------------------------

function splitCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const t = text.replace(/^﻿/, "");
  // Statements from banks use commas, semicolons or tabs
  const first = t.split(/\r?\n/).find((l) => l.trim()) ?? "";
  const delim = [",", ";", "\t"].map((d) => ({ d, n: first.split(d).length })).sort((a, b) => b.n - a.n)[0].d;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (quoted) {
      if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n: number) => String(n).padStart(2, "0");

// Accepts 2026-10-20, 20/10/2026, 20-10-2026, 20/10/26, "20 Oct 2026" and "20-Oct-2026" (day first, as in Kenya).
export function parseStatementDate(raw: string): string | null {
  const s = raw.trim().replace(/[T ]\d{1,2}:\d{2}.*$/, "");
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2}|\d{4})$/);
  if (m) return `${m[3].length === 2 ? 2000 + +m[3] : m[3]}-${pad(+m[2])}-${pad(+m[1])}`;
  m = s.match(/^(\d{1,2})[-/. ]([A-Za-z]{3,9})[-/. ,]*(\d{2}|\d{4})$/);
  if (m && MONTHS[m[2].slice(0, 3).toLowerCase()]) return `${m[3].length === 2 ? 2000 + +m[3] : m[3]}-${pad(MONTHS[m[2].slice(0, 3).toLowerCase()])}-${pad(+m[1])}`;
  return null;
}

function num(raw: string | undefined): number | null {
  if (raw == null) return null;
  let s = raw.trim();
  if (!s || s === "-") return null;
  const neg = /^\(.*\)$/.test(s) || /^-/.test(s) || /\bDR\b/i.test(s);
  s = s.replace(/[^0-9.]/g, "");
  if (!s) return null;
  const v = parseFloat(s);
  return Number.isNaN(v) ? null : neg ? -v : v;
}

const COLS = {
  date: /^(date|txn date|transaction date|completion time|value date|posting date)/i,
  desc: /(description|details|narrat|particulars|reference|remarks|transaction)/i,
  amount: /^(amount|amt)\b/i,
  debit: /(debit|withdraw|paid out|money out|dr\b)/i,
  credit: /(credit|deposit|paid in|money in|cr\b)/i,
  balance: /balance/i,
};

// Returns the lines, or an error in plain words for the person uploading.
export function parseStatementCsv(text: string): { lines: StatementLine[]; error?: string } {
  const rows = splitCsv(text);
  const headerAt = rows.findIndex((r) => r.some((c) => COLS.date.test(c.trim())) && r.some((c) => COLS.amount.test(c.trim()) || COLS.debit.test(c) || COLS.credit.test(c)));
  if (headerAt < 0) return { lines: [], error: "Could not find the columns. The first row should have headings such as Date, Description and Amount (or Paid in / Paid out)." };
  const head = rows[headerAt].map((c) => c.trim());
  const idx = (re: RegExp, skip: number[] = []) => head.findIndex((c, i) => !skip.includes(i) && re.test(c));
  const iDate = idx(COLS.date);
  const iAmount = idx(COLS.amount);
  const iDebit = iAmount >= 0 ? -1 : idx(COLS.debit);
  const iCredit = iAmount >= 0 ? -1 : idx(COLS.credit);
  const iBal = idx(COLS.balance);
  const iDesc = idx(COLS.desc, [iDate, iAmount, iDebit, iCredit, iBal]);

  const lines: StatementLine[] = [];
  for (const r of rows.slice(headerAt + 1)) {
    const date = parseStatementDate(r[iDate] ?? "");
    if (!date) continue; // totals, blank or note rows
    let amount: number | null;
    if (iAmount >= 0) amount = num(r[iAmount]);
    else {
      const out = iDebit >= 0 ? num(r[iDebit]) : null;
      const inn = iCredit >= 0 ? num(r[iCredit]) : null;
      amount = inn != null && inn !== 0 ? Math.abs(inn) : out != null && out !== 0 ? -Math.abs(out) : null;
    }
    if (amount == null || amount === 0) continue;
    lines.push({ date, description: (iDesc >= 0 ? r[iDesc] : "")?.trim() ?? "", amount: Math.round(amount * 100) / 100, balance: iBal >= 0 ? num(r[iBal]) : null });
  }
  if (!lines.length) return { lines: [], error: "No transactions were found in that file." };
  return { lines };
}

// --- Matching --------------------------------------------------------------

const dayNumber = (d: string) => Math.round(new Date(d + "T00:00:00Z").getTime() / 86_400_000);

// A statement line matches a recorded line when the amount is the same (to the cent) and the dates are within a few days of each other.
export function matchStatement(statement: StatementLine[], book: BookLine[], toleranceDays = 3): MatchResult {
  const free = book.map((b, i) => ({ b, i, used: false }));
  const matched: MatchResult["matched"] = [];
  const statementOnly: StatementLine[] = [];
  for (const s of statement) {
    let best: { i: number; gap: number } | null = null;
    for (const f of free) {
      if (f.used || Math.round(f.b.amount * 100) !== Math.round(s.amount * 100)) continue;
      const gap = Math.abs(dayNumber(f.b.date) - dayNumber(s.date));
      if (gap <= toleranceDays && (!best || gap < best.gap)) best = { i: f.i, gap };
    }
    if (best) { free[best.i].used = true; matched.push({ statement: s, book: free[best.i].b }); }
    else statementOnly.push(s);
  }
  return { matched, statementOnly, bookOnly: free.filter((f) => !f.used).map((f) => f.b) };
}

// What AUREVYN recorded for one account between two dates (money in is positive, money out negative).
export async function getBookLines(orgId: string, financeAccountId: string, from: string, to: string): Promise<BookLine[]> {
  const supabase = createClient();
  const coaId = await getAssetAccountId(supabase, orgId, financeAccountId);
  const { data, error } = await supabase
    .from("journal_lines")
    .select("debit, credit, journal_entries!inner(date, description)")
    .eq("org_id", orgId)
    .eq("coa_id", coaId)
    .gte("journal_entries.date", from)
    .lte("journal_entries.date", to);
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((l: any) => ({
    date: l.journal_entries?.date ?? "",
    description: l.journal_entries?.description ?? "",
    amount: Math.round((Number(l.debit) - Number(l.credit)) * 100) / 100,
  }));
}
