import type { Lang } from "../i18n/lang";

/** Who runs ICMBOT, for the Terms and the Privacy Policy (the owner, 31 Oct). */
export const OPERATOR: Record<Lang, { name: string; contact: string; country: string }> = {
  en: { name: "ICMBOT", contact: "info@icmbot.one", country: "Spain" },
  es: { name: "ICMBOT", contact: "info@icmbot.es", country: "España" },
};
