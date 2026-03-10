import { useBusinessLogo } from "@/hooks/useBusinessLogo";
import { useBusinessProfile } from "@/hooks/useQueries";
import { ShieldCheck } from "lucide-react";

interface BusinessHeaderProps {
  /** print: full-width print layout; sidebar: compact 32x32 logo+name; page: medium header */
  variant?: "print" | "sidebar" | "page" | "login";
  className?: string;
}

export function BusinessHeader({
  variant = "page",
  className = "",
}: BusinessHeaderProps) {
  const { logo } = useBusinessLogo();
  const { data: profile } = useBusinessProfile();
  const businessName = profile?.businessName || "GST Manager Pro";

  if (variant === "print") {
    return (
      <div
        className={`print-invoice-header flex items-start justify-between ${className}`}
      >
        <div className="flex items-center gap-4">
          {logo ? (
            <img
              src={logo}
              alt="Business Logo"
              className="h-16 w-16 object-contain"
              style={{ maxWidth: 64, maxHeight: 64 }}
            />
          ) : (
            <div className="h-16 w-16 flex items-center justify-center rounded bg-[#1e3a5f]">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
          )}
          <div>
            <div
              className="business-name"
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontSize: "20pt",
                fontWeight: 700,
                color: "#1e3a5f",
                letterSpacing: "0.02em",
              }}
            >
              {businessName}
            </div>
            {profile?.gstin && (
              <div style={{ fontSize: "9pt", color: "#555" }}>
                GSTIN: {profile.gstin}
              </div>
            )}
            {profile?.address && (
              <div style={{ fontSize: "9pt", color: "#555", maxWidth: 300 }}>
                {profile.address}
              </div>
            )}
            {profile?.contactDetails && (
              <div style={{ fontSize: "9pt", color: "#555" }}>
                {profile.contactDetails}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "sidebar") {
    return (
      <div className={`flex items-center gap-2.5 overflow-hidden ${className}`}>
        {logo ? (
          <img
            src={logo}
            alt="Logo"
            className="w-8 h-8 rounded object-contain flex-shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
        <div className="overflow-hidden min-w-0">
          <p
            className="text-sm font-bold truncate text-sidebar-foreground leading-tight"
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              letterSpacing: "0.01em",
            }}
          >
            {businessName}
          </p>
          <p className="text-xs text-muted-foreground truncate">GST Suite</p>
        </div>
      </div>
    );
  }

  if (variant === "login") {
    return (
      <div className={`flex flex-col items-center gap-3 ${className}`}>
        {logo ? (
          <img
            src={logo}
            alt="Business Logo"
            className="w-20 h-20 object-contain rounded-2xl"
          />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>
        )}
        <div className="text-center">
          <h1
            className="text-3xl font-bold text-foreground"
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              letterSpacing: "0.02em",
            }}
          >
            {businessName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            GST Compliance Suite
          </p>
        </div>
      </div>
    );
  }

  // page variant
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {logo ? (
        <img
          src={logo}
          alt="Business Logo"
          className="w-10 h-10 object-contain rounded-lg"
        />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
      )}
      <div>
        <h1
          className="text-lg font-bold text-foreground leading-tight"
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            letterSpacing: "0.02em",
          }}
        >
          {businessName}
        </h1>
        {profile?.gstin && (
          <p className="text-xs text-muted-foreground font-mono">
            {profile.gstin}
          </p>
        )}
      </div>
    </div>
  );
}
