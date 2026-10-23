/* The birthday typed as dd/mm/yyyy (plan 095). A phone's date picker makes a
 * player scroll back decades, so the form takes digits from the number
 * keyboard and adds the slashes itself. The API keeps ISO yyyy-mm-dd. */

/** Shape whatever was typed as dd/mm/yyyy: digits only, at most eight. */
export function formatTyped(typed: string): string {
  const d = typed.replace(/\D/g, "").slice(0, 8);
  return d.slice(0, 2) + (d.length > 2 ? `/${d.slice(2, 4)}` : "") + (d.length > 4 ? `/${d.slice(4)}` : "");
}

/** "02/02/1971" to "1971-02-02"; null unless it is a complete, real date. */
export function toIso(text: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return null;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const real = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return real ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

/** "1971-02-02" to "02/02/1971"; empty for anything else. */
export function fromIso(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}
