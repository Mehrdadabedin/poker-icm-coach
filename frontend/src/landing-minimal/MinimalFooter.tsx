/** One footer line. Cookie settings opens the shared consent banner through the
 * same window event the current landing page uses, so visitors can change
 * their choice from this page too. */
export function MinimalFooter() {
  return (
    <footer className="lm-footer" data-testid="minimal-footer">
      <button
        type="button"
        className="lm-footer-link"
        onClick={() => window.dispatchEvent(new CustomEvent("icmbot:cookie-settings"))}
        data-testid="minimal-cookie-settings"
      >
        Cookie settings
      </button>
      <span>© 2026 ICMBOT</span>
    </footer>
  );
}
