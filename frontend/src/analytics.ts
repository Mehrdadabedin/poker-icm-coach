type AnalyticsConsent = "granted" | "denied";

const CONSENT_STORAGE_KEY = "icmbot.analytics.consent";
const DENIED_CONSENT = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
} as const;

declare global {
  interface Window {
    dataLayer?: IArguments[];
    gtag?: (...args: unknown[]) => void;
  }
}

let consentModeInitialized = false;
let tagConfigured = false;
let currentConsent: AnalyticsConsent | null = null;
let lastPagePath: string | undefined;

function getMeasurementId(): string {
  return (
    import.meta.env.VITE_GA_MEASUREMENT_ID ||
    (import.meta.env.PROD ? "G-QTSHPPZ20P" : "")
  );
}

function readStoredConsent(): AnalyticsConsent | null {
  try {
    const storedConsent = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return storedConsent === "granted" || storedConsent === "denied"
      ? storedConsent
      : null;
  } catch {
    return null;
  }
}

export function isGoogleAnalyticsConfigured(): boolean {
  return Boolean(getMeasurementId());
}

export function getAnalyticsConsent(): AnalyticsConsent | null {
  return currentConsent ?? readStoredConsent();
}

function initializeConsentMode(): void {
  if (consentModeInitialized) return;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag =
    window.gtag ??
    function gtag() {
      window.dataLayer?.push(arguments);
    };
  window.gtag("consent", "default", DENIED_CONSENT);
  consentModeInitialized = true;
}

function updateConsentMode(consent: AnalyticsConsent): void {
  window.gtag?.("consent", "update", {
    ...DENIED_CONSENT,
    analytics_storage: consent,
  });
}

function loadGoogleTag(measurementId: string): void {
  if (!window.gtag) return;

  if (!document.getElementById("google-analytics")) {
    const script = document.createElement("script");
    script.id = "google-analytics";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);
  }

  if (tagConfigured) return;
  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    send_page_view: false,
    page_location: window.location.origin,
    page_path: "/",
  });
  tagConfigured = true;
}

export function initializeGoogleAnalytics(): void {
  const measurementId = getMeasurementId();
  if (!measurementId) return;

  initializeConsentMode();
  currentConsent = readStoredConsent();
  if (currentConsent !== "granted") return;

  updateConsentMode(currentConsent);
  loadGoogleTag(measurementId);
}

export function setAnalyticsConsent(
  consent: AnalyticsConsent,
  pathname: string,
): void {
  const previousConsent = getAnalyticsConsent();
  currentConsent = consent;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, consent);
  } catch {}

  const measurementId = getMeasurementId();
  if (!measurementId) return;

  initializeConsentMode();
  updateConsentMode(consent);
  if (consent !== "granted") return;

  if (previousConsent !== "granted") lastPagePath = undefined;
  loadGoogleTag(measurementId);
  trackPageView(pathname);
}

export function trackPageView(pathname: string): void {
  if (
    getAnalyticsConsent() !== "granted" ||
    !tagConfigured ||
    !window.gtag
  ) {
    return;
  }

  const path = pathname.split(/[?#]/, 1)[0] || "/";
  const pagePath = path.replace(/^\/table\/[^/]+(?=\/|$)/, "/table/:tableId");
  if (pagePath === lastPagePath) return;

  lastPagePath = pagePath;
  window.gtag("event", "page_view", {
    page_path: pagePath,
    page_location: `${window.location.origin}/#${pagePath}`,
    page_title: document.title,
  });
}
