import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Smartphone,
  Apple,
  Share,
  PlusSquare,
  MoreVertical,
  Download,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";

type Platform = "ios" | "android" | "desktop";

const detectPlatform = (): Platform => {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const { language } = useLanguage();
  const el = language === "el";

  const [platform, setPlatform] = useState<Platform>("desktop");
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setPlatform(detectPlatform());

    // Detect already-installed standalone mode
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const triggerInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{el ? "Εγκατάσταση Εφαρμογής - Star Gym" : "Install App - Star Gym"}</title>
        <meta
          name="description"
          content={
            el
              ? "Εγκαταστήστε το Star Gym Portal στο κινητό σας ως εφαρμογή."
              : "Install the Star Gym Portal on your phone as an app."
          }
        />
      </Helmet>

      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Button variant="ghost" asChild className="mb-6 -ml-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {el ? "Πίσω στην αρχική" : "Back to home"}
          </Link>
        </Button>

        <div className="text-center mb-10">
          <img
            src="/pwa-192.png"
            alt="Star Gym"
            width={96}
            height={96}
            className="mx-auto rounded-2xl shadow-lg mb-4"
          />
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            {el ? "Εγκατάσταση Εφαρμογής" : "Install the App"}
          </h1>
          <p className="text-muted-foreground text-lg">
            {el
              ? "Πρόσθεσε το Star Gym Portal στην οθόνη του κινητού σου"
              : "Add the Star Gym Portal to your phone's home screen"}
          </p>
        </div>

        {installed && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="pt-6 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
              <p className="font-medium">
                {el
                  ? "Η εφαρμογή είναι ήδη εγκατεστημένη! Άνοιξέ την από την αρχική οθόνη."
                  : "The app is already installed! Open it from your home screen."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Native install prompt (Android Chrome / Edge) */}
        {deferredPrompt && (
          <Card className="mb-6 border-primary">
            <CardContent className="pt-6 text-center">
              <Button size="lg" onClick={triggerInstall} className="gap-2">
                <Download className="h-5 w-5" />
                {el ? "Εγκατάσταση τώρα" : "Install now"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* iOS instructions */}
        {(platform === "ios" || platform === "desktop") && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Apple className="h-6 w-6" />
                {el ? "iPhone / iPad (Safari)" : "iPhone / iPad (Safari)"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Step
                num={1}
                icon={<Share className="h-5 w-5" />}
                text={
                  el
                    ? "Πάτα το κουμπί Κοινοποίησης στο κάτω μέρος του Safari"
                    : "Tap the Share button at the bottom of Safari"
                }
              />
              <Step
                num={2}
                icon={<PlusSquare className="h-5 w-5" />}
                text={
                  el
                    ? "Επίλεξε «Προσθήκη στην οθόνη Αφετηρίας» (Add to Home Screen)"
                    : 'Choose "Add to Home Screen"'
                }
              />
              <Step
                num={3}
                icon={<CheckCircle2 className="h-5 w-5" />}
                text={
                  el
                    ? "Πάτα «Προσθήκη» πάνω δεξιά. Έτοιμο!"
                    : 'Tap "Add" in the top right. Done!'
                }
              />
            </CardContent>
          </Card>
        )}

        {/* Android instructions */}
        {(platform === "android" || platform === "desktop") && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-6 w-6" />
                {el ? "Android (Chrome)" : "Android (Chrome)"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Step
                num={1}
                icon={<MoreVertical className="h-5 w-5" />}
                text={
                  el
                    ? "Πάτα το μενού (⋮) πάνω δεξιά στον Chrome"
                    : "Tap the menu (⋮) in the top right of Chrome"
                }
              />
              <Step
                num={2}
                icon={<Download className="h-5 w-5" />}
                text={
                  el
                    ? "Επίλεξε «Εγκατάσταση εφαρμογής» ή «Προσθήκη στην αρχική»"
                    : 'Choose "Install app" or "Add to Home screen"'
                }
              />
              <Step
                num={3}
                icon={<CheckCircle2 className="h-5 w-5" />}
                text={
                  el
                    ? "Επιβεβαίωσε. Η εφαρμογή θα εμφανιστεί στην αρχική οθόνη."
                    : "Confirm. The app will appear on your home screen."
                }
              />
            </CardContent>
          </Card>
        )}

        <div className="text-center text-sm text-muted-foreground mt-8 space-y-2">
          <p>
            {el
              ? "Η εφαρμογή λειτουργεί full-screen, χωρίς γραμμές περιήγησης, σαν κανονική native εφαρμογή."
              : "The app runs full-screen, with no browser bars, like a native app."}
          </p>
          <p>
            {el
              ? "Σύνδεση μετά την εγκατάσταση: "
              : "Sign in after installing: "}
            <Link to="/auth" className="text-primary underline">
              {el ? "Σύνδεση / Εγγραφή" : "Login / Sign up"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

const Step = ({ num, icon, text }: { num: number; icon: React.ReactNode; text: string }) => (
  <div className="flex items-start gap-4">
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm">
      {num}
    </div>
    <div className="flex items-start gap-2 pt-1">
      <span className="text-primary mt-0.5">{icon}</span>
      <span className="text-foreground">{text}</span>
    </div>
  </div>
);

export default Install;
