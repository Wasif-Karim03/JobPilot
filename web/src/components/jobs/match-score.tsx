import { cn } from "@/lib/utils";

interface MatchScoreProps {
  score: number | null | undefined;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-blue-600 dark:text-blue-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getStrokeDashoffset(score: number, radius: number) {
  const circumference = 2 * Math.PI * radius;
  return circumference - (score / 100) * circumference;
}

const sizeConfig = {
  sm: { container: "h-10 w-10", radius: 14, stroke: 3, text: "text-xs font-semibold" },
  md: { container: "h-16 w-16", radius: 22, stroke: 4, text: "text-sm font-bold" },
  lg: { container: "h-24 w-24", radius: 34, stroke: 5, text: "text-xl font-bold" },
};

export function MatchScore({ score, size = "md", showLabel = false }: MatchScoreProps) {
  if (score == null) {
    return (
      <div className={cn("flex flex-col items-center gap-1")}>
        <div
          className={cn(
            sizeConfig[size].container,
            "rounded-full border-2 border-muted flex items-center justify-center"
          )}
        >
          <span className="text-xs text-muted-foreground">—</span>
        </div>
        {showLabel && <span className="text-xs text-muted-foreground">No score</span>}
      </div>
    );
  }

  const { container, radius, stroke, text } = sizeConfig[size];
  const center = parseInt(container.split("h-")[1].split(" ")[0]) * 4 / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = getStrokeDashoffset(score, radius);
  const colorClass = getScoreColor(score);
  const svgSize = parseInt(container.split("w-")[1]) * 4;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn(container, "relative flex items-center justify-center")}>
        <svg
          className="absolute inset-0 -rotate-90"
          width={svgSize}
          height={svgSize}
          viewBox={`0 0 ${svgSize} ${svgSize}`}
        >
          {/* Background circle */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-muted"
          />
          {/* Progress circle */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={colorClass}
          />
        </svg>
        <span className={cn(text, colorClass)}>{Math.round(score)}</span>
      </div>
      {showLabel && <span className="text-xs text-muted-foreground">Match %</span>}
    </div>
  );
}

export function MatchScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return null;

  const colorClass =
    score >= 80
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : score >= 60
        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
        : score >= 40
          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", colorClass)}>
      {Math.round(score)}% match
    </span>
  );
}
