/* Persian: the player's photo on the profile page (plan 113). */
import type { portrait as en } from "../en/portrait";

export const portrait: Record<keyof typeof en, string> = {
  "portrait.title": "عکس تو",
  "portrait.status.none": "بدون عکس",
  "portrait.status.pending": "در انتظار بررسی",
  "portrait.status.approved": "تأیید شد",
  "portrait.status.rejected": "تأیید نشد",
  "portrait.hint.none": "یک عکس از خودت اضافه کن. تا وقتی یک مدیر تأییدش نکند پنهان می‌ماند.",
  "portrait.hint.pending": "یک مدیر عکست را پیش از نمایش روی صندلی‌ات سر میز بررسی می‌کند.",
  "portrait.hint.approved": "عکست روی صندلی‌ات سر میز نشان داده می‌شود.",
  "portrait.hint.rejected": "یک مدیر این عکس را تأیید نکرد. عکس دیگری انتخاب کن.",
  "portrait.choose": "انتخاب عکس",
  "portrait.change": "انتخاب عکس دیگر",
  "portrait.camera": "گرفتن عکس",
  "portrait.remove": "حذف عکس",
  "portrait.uploading": "در حال بارگذاری…",
  "portrait.note": "JPG، PNG یا WebP. عکس پیش از بارگذاری کوچک می‌شود.",
  "portrait.error": "این فایل قابل استفاده نبود. یک عکس JPG، PNG یا WebP انتخاب کن.",
  "portrait.alt": "عکس تو",
};
