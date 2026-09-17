interface AuthMessagesProps {
  error: string | null;
  notice: string | null;
  success: string | null;
}

/** Status lines under the form. Each keeps its own live region so an error or a
 * provider notice is announced without moving focus. */
export function AuthMessages({ error, notice, success }: AuthMessagesProps) {
  return (
    <>
      {error && (
        <p className="auth-error" role="alert" data-testid="auth-error">
          {error}
        </p>
      )}
      {notice && (
        <p className="auth-notice" role="status" data-testid="provider-notice">
          {notice}
        </p>
      )}
      {success && (
        <p className="auth-success" role="status" data-testid="auth-success">
          {success}
        </p>
      )}
    </>
  );
}
