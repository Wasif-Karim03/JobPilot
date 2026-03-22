import Link from "next/link";
import {
  Zap,
  Search,
  Brain,
  Mail,
  FileText,
  BarChart3,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { buttonVariants } from "@/lib/button-variants";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Search,
    title: "Autonomous Job Discovery",
    description:
      "Claude searches the web daily across job boards and company career pages, finding new roles that match your profile — no manual searching required.",
  },
  {
    icon: Brain,
    title: "AI Match Analysis",
    description:
      "Every job is analyzed against your resume for title relevance, skills match, and experience alignment. Missing keywords are surfaced so you can tailor efficiently.",
  },
  {
    icon: Mail,
    title: "Gmail Auto-Tracking",
    description:
      "Connect your Gmail (read-only). JobPilot detects application confirmations, rejections, interview invites, and offers — updating your tracker automatically.",
  },
  {
    icon: FileText,
    title: "Resume Editor + Tailoring",
    description:
      "Edit your master resume with a structured form or rich-text editor. One click tailors it to a specific job, adding missing keywords and adjusting your summary.",
  },
  {
    icon: BarChart3,
    title: "Kanban Application Tracker",
    description:
      "Drag-and-drop applications through stages: Applied → Phone Screen → Interview → Offer. Full status timeline with timestamps and source indicators.",
  },
  {
    icon: Zap,
    title: "Contact Enrichment & Outreach",
    description:
      "For top-match jobs, Claude researches company contacts — executives, HR, alumni. Generates personalized email and LinkedIn outreach drafts.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Set up once",
    description:
      "Upload your resume, set your job preferences (titles, locations, salary), and paste your Anthropic API key. You control your AI costs directly.",
  },
  {
    step: "2",
    title: "Let it run",
    description:
      "JobPilot searches daily at your chosen time. Jobs are scored, contacts discovered, and your inbox is scanned for status updates.",
  },
  {
    step: "3",
    title: "Stay organized",
    description:
      "Your dashboard shows the best matches, your kanban tracks applications, and outreach drafts are ready when you want to reach out.",
  },
];

const WHAT_YOU_GET = [
  "Daily automated job search across all major boards",
  "AI resume-to-job match scoring (0–100%)",
  "Missing keyword detection for ATS optimization",
  "Company intel and contact discovery for 80%+ matches",
  "Gmail integration for automatic status detection",
  "Kanban board with drag-and-drop status tracking",
  "Resume editor with structured form + rich text",
  "Personalized outreach draft generation",
  "Your own Claude API key — no markup on AI costs",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">JobPilot</span>
          </div>
          <div className="flex gap-3">
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }))}>Sign in</Link>
            <Link href="/register" className={cn(buttonVariants())}>Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-20 pb-16 text-center">
        <Badge variant="outline" className="mb-6 gap-1.5">
          <Zap className="h-3 w-3" />
          Powered by Claude AI — your API key, your costs
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6 leading-tight">
          Your job search,
          <br />
          <span className="text-primary">on autopilot.</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          JobPilot autonomously searches for jobs daily, scores them against your resume,
          tracks your applications via Gmail, and generates personalized outreach — all
          powered by Claude AI using your own API key.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/register" className={cn(buttonVariants({ size: "lg" }))}>
            Start for Free
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
          <Link href="/login" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>Sign In</Link>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          No subscription fee. You only pay Anthropic for your own API usage (~$3–15/search).
        </p>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center mb-12">Everything you need to land the job</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="bg-background rounded-xl border p-5 space-y-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold text-sm">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-12">How it works</h2>
        <div className="grid sm:grid-cols-3 gap-8">
          {HOW_IT_WORKS.map(({ step, title, description }) => (
            <div key={step} className="relative text-center">
              <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground text-lg font-bold flex items-center justify-center mx-auto mb-4">
                {step}
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What you get */}
      <section className="border-t bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">What&apos;s included</h2>
            <ul className="space-y-3">
              {WHAT_YOU_GET.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-10 text-center">
              <Link href="/register" className={cn(buttonVariants({ size: "lg" }))}>
                Get Started Free
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="max-w-5xl mx-auto px-4 py-8 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span>JobPilot</span>
          </div>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-foreground">Sign In</Link>
            <Link href="/register" className="hover:text-foreground">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
