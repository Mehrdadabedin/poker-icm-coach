/* English, the source language (plan 093). Every key the site translates is
 * here; es.ts must have the same keys and the same {placeholders}.
 * Keys are grouped by screen. */
export const en = {
  "lang.label": "Language",

  "auth.username": "Email or username",
  "auth.password": "Password",
  "auth.confirm": "Confirm password",
  "auth.showPassword": "Show password",
  "auth.hidePassword": "Hide password",
  "auth.wait": "Please wait…",
  "auth.signIn": "Sign in",
  "auth.signUp": "Sign up",
  "auth.usernameRequired": "Username is required.",
  "auth.passwordRequired": "Password is required.",
  "auth.passwordShort": "Password must be at least {min} characters.",
  "auth.passwordMismatch": "Passwords do not match.",
  "auth.created": "Account \"{name}\" created. You are now signed in.",
  "auth.haveAccount": "Already have an account?",
  "auth.noAccount": "Don't have an account?",
  "auth.signedInAs": "Signed in as",
  "auth.google": "Continue with Google",
  "auth.googleUnavailable": "Google sign-in isn't available yet. For now, you can sign in with your username and password.",
  "auth.or": "or",
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
