/** One footer line. Cookie settings is not repeated here: the shared consent
 * banner already shows its own Cookie settings button on every page. */
export function MinimalFooter() {
  return (
    <footer className="lm-footer" data-testid="minimal-footer">
      <span>© 2026 ICMBOT. Practice only, no real money.</span>
    </footer>
  );
}
