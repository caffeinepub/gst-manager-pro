import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Business } from "@/hooks/useBusinessContext";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { INDIAN_STATES } from "@/types/gst";
import type { AppPage } from "@/types/gst";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

const HUXLEY_FONT =
  '"Huxley Titling", "Cinzel", "Playfair Display", Georgia, serif';

interface BusinessSetupWizardProps {
  onComplete: (page: AppPage) => void;
}

type UserRole = "admin" | "user";
type BusinessType = "Regular" | "Composition" | "Unregistered";

export function BusinessSetupWizard({ onComplete }: BusinessSetupWizardProps) {
  const { addBusiness } = useBusinessContext();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<UserRole>("user");
  const [name, setName] = useState("");
  const [gstin, setGstin] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("Regular");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdBizName, setCreatedBizName] = useState("");
  const [createdGstin, setCreatedGstin] = useState("");

  const validateGstin = (v: string) =>
    !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);

  const handleStep2Submit = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Business name is required";
    if (gstin && !validateGstin(gstin))
      errs.gstin = "Invalid GSTIN format (15 alphanumeric characters)";
    if (!stateCode) errs.stateCode = "Please select a state";
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    const biz: Omit<Business, "id" | "createdAt" | "updatedAt"> = {
      name: name.trim(),
      gstin: gstin.toUpperCase(),
      stateCode,
      role,
      businessType,
    };
    addBusiness(biz);
    setCreatedBizName(name.trim());
    setCreatedGstin(gstin.toUpperCase());
    setStep(3);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo/Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: HUXLEY_FONT, letterSpacing: "0.04em" }}
          >
            GST Manager Pro
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Multi-Business Suite
          </p>
        </motion.div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  s < step
                    ? "bg-primary text-primary-foreground"
                    : s === step
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {s < step ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`h-0.5 w-12 rounded transition-colors ${
                    s < step ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-card rounded-2xl border border-border p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-foreground mb-1">
                What best describes you?
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                This helps us tailor your experience
              </p>

              <div className="space-y-3">
                <button
                  type="button"
                  data-ocid="setup.owner_role.button"
                  onClick={() => setRole("user")}
                  className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                    role === "user"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/40"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">
                      Business Owner / Manager
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Managing a single or primary business entity
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  data-ocid="setup.admin_role.button"
                  onClick={() => setRole("admin")}
                  className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                    role === "admin"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/40"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      role === "admin"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">
                      CA / Accountant / Multi-entity
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Managing multiple clients or business entities
                    </p>
                  </div>
                </button>
              </div>

              <Button
                className="w-full mt-6"
                onClick={() => setStep(2)}
                data-ocid="setup.next.button"
              >
                Continue
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-card rounded-2xl border border-border p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-foreground mb-1">
                Business Details
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Tell us about your first business
              </p>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="biz-name" className="text-sm font-medium">
                    Business Name *
                  </Label>
                  <Input
                    id="biz-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Militis Technologies Pvt Ltd"
                    className="mt-1.5"
                    data-ocid="setup.business_name.input"
                  />
                  {errors.name && (
                    <p
                      className="text-xs text-destructive mt-1"
                      data-ocid="setup.name.error_state"
                    >
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="biz-gstin" className="text-sm font-medium">
                    GSTIN{" "}
                    <span className="text-muted-foreground font-normal">
                      (Optional)
                    </span>
                  </Label>
                  <Input
                    id="biz-gstin"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="e.g. 27AABCU9603R1ZX"
                    className="mt-1.5 font-mono"
                    maxLength={15}
                    data-ocid="setup.gstin.input"
                  />
                  {errors.gstin && (
                    <p
                      className="text-xs text-destructive mt-1"
                      data-ocid="setup.gstin.error_state"
                    >
                      {errors.gstin}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium">State *</Label>
                  <Select value={stateCode} onValueChange={setStateCode}>
                    <SelectTrigger
                      className="mt-1.5"
                      data-ocid="setup.state.select"
                    >
                      <SelectValue placeholder="Select your state" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((s) => (
                        <SelectItem key={s.code} value={s.code}>
                          {s.name} ({s.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.stateCode && (
                    <p
                      className="text-xs text-destructive mt-1"
                      data-ocid="setup.state.error_state"
                    >
                      {errors.stateCode}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium">Business Type</Label>
                  <Select
                    value={businessType}
                    onValueChange={(v) => setBusinessType(v as BusinessType)}
                  >
                    <SelectTrigger
                      className="mt-1.5"
                      data-ocid="setup.business_type.select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Regular">Regular</SelectItem>
                      <SelectItem value="Composition">
                        Composition Scheme
                      </SelectItem>
                      <SelectItem value="Unregistered">Unregistered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(1)}
                  data-ocid="setup.back.button"
                >
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleStep2Submit}
                  data-ocid="setup.create.button"
                >
                  Create Business
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card rounded-2xl border border-border p-6 shadow-sm text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </motion.div>

              <h2 className="text-xl font-semibold text-foreground mb-2">
                Your business is set up!
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                You're ready to start managing GST compliance
              </p>

              <div className="bg-muted/50 rounded-xl p-4 mb-6 text-left">
                <p
                  className="font-bold text-foreground text-base"
                  style={{ fontFamily: HUXLEY_FONT, letterSpacing: "0.03em" }}
                >
                  {createdBizName}
                </p>
                {createdGstin && (
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    {createdGstin}
                  </p>
                )}
              </div>

              <Button
                className="w-full"
                onClick={() => onComplete("dashboard")}
                data-ocid="setup.go_dashboard.button"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
