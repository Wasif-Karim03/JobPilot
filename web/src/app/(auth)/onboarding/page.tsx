"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText, SlidersHorizontal, Mail, ClipboardList } from "lucide-react";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { StepResume } from "@/components/onboarding/step-resume";
import { StepPreferences } from "@/components/onboarding/step-preferences";
import { StepGmail } from "@/components/onboarding/step-gmail";
import { StepReview } from "@/components/onboarding/step-review";
import { trpc } from "@/lib/trpc-client";

const STEPS = [
  { label: "Resume", icon: FileText },
  { label: "Preferences", icon: SlidersHorizontal },
  { label: "Gmail", icon: Mail },
  { label: "Review", icon: ClipboardList },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { step, setStep, nextStep, prevStep } = useOnboardingStore();

  // Redirect if already onboarded
  const { data: status } = trpc.user.getOnboardingStatus.useQuery();
  useEffect(() => {
    if (status?.onboardingComplete) {
      router.replace("/dashboard");
    }
  }, [status, router]);

  function handleComplete() {
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="font-semibold text-lg">JobPilot</span>
          <span className="text-sm text-muted-foreground">
            Step {step} of {STEPS.length}
          </span>
        </div>
      </header>

      {/* Stepper */}
      <div className="border-b bg-muted/30">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => {
              const stepNum = i + 1;
              const isCompleted = step > stepNum;
              const isCurrent = step === stepNum;
              const Icon = s.icon;

              return (
                <div key={s.label} className="flex items-center flex-1 last:flex-none">
                  <button
                    type="button"
                    onClick={() => {
                      if (stepNum < step) setStep(stepNum as 1 | 2 | 3 | 4);
                    }}
                    disabled={stepNum >= step}
                    className={`flex items-center gap-2 transition-colors ${
                      stepNum < step ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors ${
                        isCompleted
                          ? "bg-primary border-primary text-primary-foreground"
                          : isCurrent
                            ? "border-primary text-primary bg-background"
                            : "border-muted-foreground/30 text-muted-foreground/50 bg-background"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium hidden sm:block ${
                        isCurrent
                          ? "text-foreground"
                          : isCompleted
                            ? "text-muted-foreground"
                            : "text-muted-foreground/50"
                      }`}
                    >
                      {s.label}
                    </span>
                  </button>

                  {i < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 sm:mx-3 transition-colors ${
                        step > stepNum ? "bg-primary" : "bg-border"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-2xl">
          {step === 1 && <StepResume onNext={nextStep} />}
          {step === 2 && <StepPreferences onNext={nextStep} onBack={prevStep} />}
          {step === 3 && <StepGmail onNext={nextStep} onBack={prevStep} />}
          {step === 4 && (
            <StepReview
              onComplete={handleComplete}
              onGoToStep={(s) => setStep(s as 1 | 2 | 3 | 4)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
