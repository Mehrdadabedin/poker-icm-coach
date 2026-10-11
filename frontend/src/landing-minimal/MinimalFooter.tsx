/** Footer: the copyright on the left, the practice-only note and Cookie
 * settings on the right. The consent banner shows no floating button once a
 * choice is saved, so this link (the same window event the current landing
 * footer uses) is how a visitor changes their choice. */
export function MinimalFooter() {
  return (
    <footer className="lm-footer" data-testid="minimal-footer">
      <div className="lm-footer-inner">
        <span data-testid="minimal-copyright">© 2026 ICMBOT</span>
        <span className="lm-footer-right">
          <span>Practice only, no real money.</span>
          <button
            type="button"
            className="lm-footer-link"
            onClick={() => window.dispatchEvent(new CustomEvent("icmbot:cookie-settings"))}
            data-testid="minimal-cookie-settings"
          >
            Cookie settings
          </button>
        </span>
      </div>
    </footer>
  );
}
