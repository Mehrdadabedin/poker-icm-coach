import { useState, type FormEvent, type ReactNode } from "react";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/messages/en";
import { getUsername } from "../services/api";
import { fromIso, formatTyped, toIso } from "../services/birthdayInput";
import { ageOn, ApiStatusError, GENDERS, saveProfile, type Profile, type ProfileField } from "../services/profileApi";

const MIN_AGE = 18;
type Errors = Partial<Record<ProfileField, MessageKey>>;

const blank = (): Profile => ({
  firstName: "", lastName: "", displayName: getUsername() ?? "", birthday: "",
  gender: "prefer_not_to_say", genderText: null,
});

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="profile-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <span className="profile-error" role="alert" data-testid={`${id}-error`}>{error}</span>}
    </div>
  );
}

/** PERSONAL DETAILS (plan 095): the server checks every field again; the age
 * is also checked here so a player under 18 gets a clear message at once. */
export function ProfileForm({ initial, onSaved }: { initial: Profile | null; onSaved: (p: Profile) => void }) {
  const t = useT();
  const [form, setForm] = useState<Profile>(initial ?? blank());
  const [birthdayText, setBirthdayText] = useState(() => fromIso(initial?.birthday ?? ""));
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  const set = <K extends ProfileField>(field: K, value: Profile[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setState("idle");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (birthdayText && !toIso(birthdayText)) {
      setErrors({ birthday: "profile.error.birthday" });
      return;
    }
    if (form.birthday && ageOn(form.birthday) < MIN_AGE) {
      setErrors({ birthday: "profile.error.age" });
      return;
    }
    setState("saving");
    try {
      const saved = await saveProfile({ ...form, genderText: form.gender === "self_described" ? form.genderText : null });
      setForm(saved);
      setBirthdayText(fromIso(saved.birthday));
      onSaved(saved);
      setState("saved");
    } catch (error) {
      if (error instanceof ApiStatusError && error.status === 422 && error.fields.length > 0) {
        setErrors(Object.fromEntries(error.fields.map((field) => [field, `profile.error.${field}`])) as Errors);
        setState("idle");
      } else {
        setState("failed");
      }
    }
  };

  const err = (field: ProfileField) => (errors[field] ? t(errors[field]) : undefined);
  const text = (field: "firstName" | "lastName" | "displayName", max: number) => (
    <Field id={`profile-${field}`} label={t(`profile.${field}`)} error={err(field)}>
      <input id={`profile-${field}`} value={form[field]} maxLength={max} required
        onChange={(e) => set(field, e.target.value)} data-testid={`profile-${field}`} />
    </Field>
  );

  return (
    <form className="profile-card" onSubmit={(e) => void submit(e)} noValidate data-testid="profile-form">
      <div className="profile-card-head">
        <h2 className="profile-card-title">{t("profile.details")}</h2>
        <span className="profile-private">{t("profile.private")}</span>
      </div>
      <div className="profile-grid">
        {text("firstName", 40)}
        {text("lastName", 40)}
        <div className="profile-wide">{text("displayName", 24)}</div>
        <Field id="profile-birthday" label={t("profile.birthday")} error={err("birthday")}>
          <input id="profile-birthday" type="text" inputMode="numeric" autoComplete="bday" required
            placeholder={t("profile.birthdayPlaceholder")} maxLength={10} value={birthdayText}
            onChange={(e) => {
              const typed = formatTyped(e.target.value);
              setBirthdayText(typed);
              set("birthday", toIso(typed) ?? "");
            }} data-testid="profile-birthday" />
        </Field>
        <Field id="profile-gender" label={t("profile.gender")} error={err("gender")}>
          <select id="profile-gender" value={form.gender} data-testid="profile-gender"
            onChange={(e) => set("gender", e.target.value as Profile["gender"])}>
            {GENDERS.map((g) => <option key={g} value={g}>{t(`profile.gender.${g}`)}</option>)}
          </select>
        </Field>
        {form.gender === "self_described" && (
          <div className="profile-wide">
            <Field id="profile-genderText" label={t("profile.genderText")} error={err("genderText")}>
              <input id="profile-genderText" value={form.genderText ?? ""} maxLength={40}
                onChange={(e) => set("genderText", e.target.value)} data-testid="profile-genderText" />
            </Field>
          </div>
        )}
      </div>
      <p className="profile-why">{t("profile.why")}</p>
      <button type="submit" className="btn btn-primary profile-save" disabled={state === "saving"} data-testid="profile-save">
        {state === "saving" ? t("profile.saving") : t("profile.save")}
      </button>
      {state === "saved" && <p className="profile-status" role="status">{t("profile.saved")}</p>}
      {state === "failed" && <p className="profile-error" role="alert">{t("profile.error.generic")}</p>}
    </form>
  );
}
