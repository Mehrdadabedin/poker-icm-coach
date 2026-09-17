import type { ReactNode } from "react";
import { LockIcon, MailIcon } from "./AuthIcons";

interface AuthFieldProps {
  /** Which leading mark to draw. Two shapes only, so no icon is passed in. */
  kind: "mail" | "lock";
  type: "text" | "password";
  value: string;
  placeholder: string;
  label: string;
  testId: string;
  autoComplete: string;
  maxLength?: number;
  onChange: (value: string) => void;
  onSubmit: () => void;
  /** Optional control on the right edge, for example the password reveal. */
  trailing?: ReactNode;
}

/** One rounded input row: light leading mark, borderless input, optional
 * trailing control. Enter in the input submits the form. */
export function AuthField({
  kind,
  type,
  value,
  placeholder,
  label,
  testId,
  autoComplete,
  maxLength,
  onChange,
  onSubmit,
  trailing,
}: AuthFieldProps) {
  return (
    <div className="auth-field">
      <span className="auth-field-mark">{kind === "mail" ? <MailIcon /> : <LockIcon />}</span>
      <input
        className="auth-input"
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-label={label}
        autoComplete={autoComplete}
        data-testid={testId}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          // preventDefault stops the implicit form submit, so one Enter press
          // never runs login/register twice.
          event.preventDefault();
          onSubmit();
        }}
      />
      {trailing}
    </div>
  );
}
