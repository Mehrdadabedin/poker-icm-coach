/* Persian: the photo reminder on the home page (plan 113). */
import type { portraitPrompt as en } from "../en/portraitPrompt";

export const portraitPrompt: Record<keyof typeof en, string> = {
  "portraitPrompt.none.title": "عکست را اضافه کن",
  "portraitPrompt.none.text": "صندلی‌ات هنوز عکس ندارد. یکی اضافه کن تا میز تو را مثل Emma و ربات‌های دیگر نشان دهد. اول یک مدیر آن را بررسی می‌کند؛ در این مدت می‌توانی بازی کنی.",
  "portraitPrompt.pending.title": "عکست در انتظار بررسی است",
  "portraitPrompt.pending.text": "تا وقتی یک مدیر تأییدش کند، با حرف اول نامت بازی می‌کنی.",
  "portraitPrompt.rejected.title": "عکست تأیید نشد",
  "portraitPrompt.rejected.text": "عکس دیگری انتخاب کن. در این مدت با حرف اول نامت بازی می‌کنی.",
  "portraitPrompt.add": "افزودن عکس",
  "portraitPrompt.later": "الان نه",
  "portraitPrompt.choose": "انتخاب عکس دیگر",
  "portraitPrompt.ok": "متوجه شدم",
};
