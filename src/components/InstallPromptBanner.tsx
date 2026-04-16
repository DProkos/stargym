import { useEffect, useState } from "react";
import { X, Share, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "stargym_install_prompt_dismissed_v1";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPromptBanner() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    (async () => {
      // Skip if already dismissed
      if (localStorage.getItem(STORAGE_KEY)) return;

      // Skip if already installed (running in standalone)
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      if (isStandalone) return;

      // Skip if not mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      if (!isMobile) return;

      // Skip inside iframe (Lovable preview)
      try {
        if (window.self !== window.top) return;
      } catch {
        return;
      }

      // Check admin toggle
      const { data } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "pwa_install_prompt_enabled")
        .maybeSingle();
      if (data?.setting_value === "false") return;

      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      setIsIOS(ios);

      const onBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setVisible(true);
      };

      window.addEventListener("beforeinstallprompt", onBeforeInstall);

      // For iOS (no beforeinstallprompt support), show after small delay
      if (ios) {
        const t = setTimeout(() => setVisible(true), 1500);
        cleanup = () => {
          clearTimeout(t);
          window.removeEventListener("beforeinstallprompt", onBeforeInstall);
        };
      } else {
        cleanup = () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      }
    })();

    return () => {
      cleanup?.();
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 z-50 sm:hidden animate-in slide-in-from-bottom-5">
      <div className="bg-card border-2 border-primary rounded-xl shadow-2xl p-3 flex items-start gap-3">
        <img
          src="/favicon.png"
          alt="Star Gym"
          className="w-12 h-12 rounded-lg flex-shrink-0 bg-black"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-foreground">Εγκατάσταση Star Gym</h3>
          {isIOS ? (
            <p className="text-xs text-muted-foreground mt-1 leading-snug">
              Πάτα <Share className="inline w-3 h-3 mx-0.5" /> και μετά{" "}
              <span className="font-medium">"Προσθήκη στην οθόνη Αφετηρίας"</span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1 leading-snug">
              Πρόσθεσέ μας στην αρχική σου οθόνη για γρήγορη πρόσβαση.
            </p>
          )}
          {!isIOS && deferredPrompt && (
            <Button
              size="sm"
              className="mt-2 h-8 text-xs w-full"
              onClick={handleInstall}
            >
              <Download className="w-3 h-3 mr-1" />
              Εγκατάσταση
            </Button>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label="Close"
          className="text-muted-foreground hover:text-foreground p-1 -mr-1 -mt-1 flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
