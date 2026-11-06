import { useState, type InputHTMLAttributes } from "react";
import { useI18n } from "../i18n/I18n";
import { ownDigits, parseDigits } from "../i18n/digits";
import { localeOf } from "../i18n/lang";

type BoxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  value: number;
  onValue: (n: number) => void;
};

const read = (text: string) => {
  const n = Number(parseDigits(text).trim());
  return Number.isFinite(n) ? n : 0;
};

/** A box that takes a number (plan 113). A plain type="number" box, except in
 * a language that writes its own digits: there it takes text, reads ۰-۹ as
 * 0-9 and shows the number in the language's digits. What was typed is kept
 * while it still means the same number, so "۱۲٫" can become "۱۲٫۵". */
export function NumberBox({ value, onValue, ...rest }: BoxProps) {
  const { lang } = useI18n();
  const [typed, setTyped] = useState<string | null>(null);
  if (!ownDigits(lang)) {
    return <input {...rest} type="number" value={value} onChange={(e) => onValue(Number(e.target.value))} />;
  }
  const shown = typed !== null && read(typed) === value ? typed
    : value.toLocaleString(localeOf(lang), { useGrouping: false, maximumFractionDigits: 20 });
  return (
    <input {...rest} type="text" inputMode="decimal" value={shown}
      onChange={(e) => {
        setTyped(e.target.value);
        onValue(read(e.target.value));
      }} />
  );
}
