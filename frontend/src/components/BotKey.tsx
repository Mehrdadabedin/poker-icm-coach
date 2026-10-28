import { BOT_PROFILES } from "../models/botProfiles";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/messages/en";

const STYLE: Record<string, MessageKey> = {
  tag: "bot.tag.style", lag: "bot.lag.style", tight_passive: "bot.tp.style", loose_passive: "bot.lp.style",
};

/** The four seat-ring colours and the style each one means. A Free player did
 * not choose the lineup, so the table tells which bot plays how (plan 101). */
export function BotKey() {
  const t = useT();
  return (
    <p className="bot-key" aria-label={t("botKey.title")} data-testid="bot-key">
      {BOT_PROFILES.map((p) => (
        <span key={p.id} className="bot-key-item">
          <i className="bot-key-dot" style={{ background: p.avatar.color }} aria-hidden="true" />
          {t(STYLE[p.backend])}
        </span>
      ))}
    </p>
  );
}
