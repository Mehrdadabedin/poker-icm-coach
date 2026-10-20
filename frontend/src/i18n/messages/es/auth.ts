/* Spanish: the language menu and the sign-in screen (plan 093). */
import type { auth as en } from "../en/auth";

export const auth: Record<keyof typeof en, string> = {
  "lang.label": "Idioma",
  "auth.username": "Correo o usuario",
  "auth.password": "Contraseña",
  "auth.confirm": "Confirmar contraseña",
  "auth.showPassword": "Mostrar contraseña",
  "auth.hidePassword": "Ocultar contraseña",
  "auth.wait": "Un momento…",
  "auth.signIn": "Iniciar sesión",
  "auth.signUp": "Registrarse",
  "auth.usernameRequired": "El usuario es obligatorio.",
  "auth.passwordRequired": "La contraseña es obligatoria.",
  "auth.passwordShort": "La contraseña debe tener al menos {min} caracteres.",
  "auth.passwordMismatch": "Las contraseñas no coinciden.",
  "auth.created": "Cuenta \"{name}\" creada. Ya has iniciado sesión.",
  "auth.haveAccount": "¿Ya tienes una cuenta?",
  "auth.noAccount": "¿No tienes una cuenta?",
  "auth.signedInAs": "Sesión iniciada como",
  "auth.google": "Continuar con Google",
  "auth.googleUnavailable": "El inicio de sesión con Google aún no está disponible. Por ahora, entra con tu usuario y contraseña.",
  "auth.or": "o",
};
