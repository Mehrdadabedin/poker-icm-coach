/* Digits typed and shown in the site's language (plan 113). Persian keyboards
 * type ۰-۹ (and some Arabic layouts ٠-٩); the site writes Persian digits under
 * fa (the owner, 5 Nov). Number() reads neither, so every box that takes a
 * number turns them into 0-9 first. */
import { localDigits, ownDigits } from "./lang";

export { localDigits, ownDigits };

const PERSIAN_ZERO = 0x06f0;
const ARABIC_ZERO = 0x0660;

/** "۴۵٬۰۰۰" to "45000", "۶٫۵" to "6.5"; anything else is left as typed. */
export const parseDigits = (text: string): string => text
  .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - PERSIAN_ZERO))
  .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - ARABIC_ZERO))
  .replace(/٫/g, ".")
  .replace(/٬/g, "");
