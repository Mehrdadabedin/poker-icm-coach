import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/messages/en";
import { clearAuth } from "../services/api";
import { ApiStatusError, deleteAccount, downloadMyData, type Account } from "../services/profileApi";

const DELETE_ERRORS: Record<number, MessageKey> = {
  400: "account.error.confirm", 403: "account.error.password", 409: "account.error.admin",
};

/** ACCOUNT (plan 095): download my data, and delete the account. Both app
 * stores require deletion inside the app. A password account types its
 * password again; a Google account, which has none here, types DELETE. */
export function AccountPanel({ account }: { account: Account | null }) {
  const t = useT();
  const navigate = useNavigate();
  const [asking, setAsking] = useState(false);
  const [proof, setProof] = useState("");
  const [error, setError] = useState<MessageKey | null>(null);
  const [busy, setBusy] = useState(false);
  const google = account?.signIn === "google";

  const download = async () => {
    setError(null);
    try {
      await downloadMyData();
    } catch {
      setError("account.error.generic");
    }
  };

  const remove = async () => {
    if (google && proof !== "DELETE") {
      setError("account.error.confirm");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(google ? { confirm: "DELETE" } : { password: proof });
      clearAuth();
      navigate("/", { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiStatusError ? DELETE_ERRORS[caught.status] ?? "account.error.generic"
        : "account.error.generic");
      setBusy(false);
    }
  };

  return (
    <section className="profile-card" aria-labelledby="account-title" data-testid="account-panel">
      <h2 id="account-title" className="profile-card-title">{t("account.title")}</h2>
      {account && (
        <p className="profile-why">
          {google ? t("account.signIn.google", { email: account.email ?? "" }) : t("account.signIn.password")}
        </p>
      )}
      <div className="account-row">
        <span>{t("account.downloadHint")}</span>
        <button type="button" className="btn" onClick={() => void download()} data-testid="account-download">
          {t("account.download")}
        </button>
      </div>
      {account?.admin ? (
        <p className="profile-why">{t("account.error.admin")}</p>
      ) : !asking ? (
        <div className="account-row">
          <span className="account-danger">{t("account.deleteWarn")}</span>
          <button type="button" className="btn account-delete" onClick={() => setAsking(true)} data-testid="account-delete">
            {t("account.delete")}
          </button>
        </div>
      ) : (
        <div className="account-confirm" data-testid="account-confirm">
          <label htmlFor="account-proof">{google ? t("account.typeDelete") : t("account.password")}</label>
          <input id="account-proof" type={google ? "text" : "password"} value={proof} autoComplete="current-password"
            onChange={(e) => { setProof(e.target.value); setError(null); }} data-testid="account-proof" />
          <div className="account-actions">
            <button type="button" className="btn account-delete" disabled={busy || proof === ""}
              onClick={() => void remove()} data-testid="account-confirm-delete">
              {t("account.confirmDelete")}
            </button>
            <button type="button" className="btn" onClick={() => { setAsking(false); setProof(""); setError(null); }}>
              {t("account.cancel")}
            </button>
          </div>
        </div>
      )}
      {error && <p className="profile-error" role="alert" data-testid="account-error">{t(error)}</p>}
    </section>
  );
}
