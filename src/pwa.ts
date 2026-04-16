// PWA service worker registration with Lovable-preview safety guards.
// Service workers MUST NOT register inside the preview iframe (they break HMR
// and cache stale content). Only register on the real published origin in a
// top-level browsing context.

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const host = window.location.hostname;
const isPreviewHost =
  host.includes("id-preview--") ||
  host.includes("lovableproject.com") ||
  host.includes("lovable.app") ||
  host === "localhost" ||
  host === "127.0.0.1";

export async function setupPWA() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  // In preview / iframe / dev: aggressively unregister any leftover SWs so the
  // preview never serves stale cached pages.
  if (isPreviewHost || isInIframe) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    } catch {
      /* ignore */
    }
    return;
  }

  // Production / published site only.
  try {
    const { registerSW } = await import("virtual:pwa-register");
    registerSW({ immediate: true });
  } catch (err) {
    console.warn("PWA registration skipped:", err);
  }
}
