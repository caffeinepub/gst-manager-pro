import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import {
  AlertCircle,
  BarChart3,
  FileText,
  Loader2,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

export function Login() {
  const { login, isLoggingIn, isLoginError, loginError } =
    useInternetIdentity();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-5"
          style={{ background: "oklch(0.72 0.17 162)" }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-5"
          style={{ background: "oklch(0.65 0.18 250)" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.02]"
          style={{ background: "oklch(0.72 0.17 162)" }}
        />
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left: Branding */}
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-cabinet font-extrabold tracking-tight">
                  GST Manager
                </h1>
                <p className="text-xs text-muted-foreground">
                  Enterprise Compliance Suite
                </p>
              </div>
            </div>
            <p className="text-muted-foreground text-base leading-relaxed">
              Complete GST compliance and accounting solution for Indian
              businesses. Automate invoicing, filing, and reporting.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              {
                icon: FileText,
                label: "Smart Invoicing",
                desc: "Auto-calculate CGST, SGST, IGST",
              },
              {
                icon: ShieldCheck,
                label: "GST Compliance",
                desc: "GSTR-1, GSTR-3B ready",
              },
              {
                icon: BarChart3,
                label: "Analytics",
                desc: "Real-time financial reports",
              },
              {
                icon: TrendingUp,
                label: "AI Assistant",
                desc: "GST queries answered instantly",
              },
            ].map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="p-3 rounded-lg bg-card/50 border border-border/50"
              >
                <Icon className="w-4 h-4 text-primary mb-1.5" />
                <p className="text-xs font-semibold">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>✓ GSTN Compliant</span>
            <span>✓ e-Invoice Ready</span>
            <span>✓ Secure</span>
          </div>
        </div>

        {/* Right: Login Card */}
        <Card className="bg-card border-border/70 shadow-card">
          <CardContent className="pt-8 pb-8 px-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-cabinet font-bold">Welcome Back</h2>
              <p className="text-sm text-muted-foreground">
                Sign in to access your GST management dashboard
              </p>
            </div>

            {isLoginError && (
              <div
                className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
                data-ocid="login.error_state"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>
                  {loginError?.message || "Login failed. Please try again."}
                </span>
              </div>
            )}

            <Button
              onClick={login}
              disabled={isLoggingIn}
              className="w-full h-11 gap-2 text-base font-semibold"
              data-ocid="login.primary_button"
            >
              {isLoggingIn ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
              {isLoggingIn ? "Connecting..." : "Sign In Securely"}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Secured by Internet Identity — a decentralized authentication
              system on the Internet Computer
            </p>

            <div className="pt-4 border-t border-border/50 text-center">
              <p className="text-xs text-muted-foreground">
                © {new Date().getFullYear()}. Built with love using{" "}
                <a
                  href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  caffeine.ai
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
