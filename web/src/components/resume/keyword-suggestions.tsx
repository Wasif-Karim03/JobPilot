"use client";

import { Tag, Plus, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface KeywordSuggestionsProps {
  keywords: string[];
  existingKeywords: string[];
  onAdd: (keyword: string) => void;
  jobTitle?: string;
}

export function KeywordSuggestions({
  keywords,
  existingKeywords,
  onAdd,
  jobTitle,
}: KeywordSuggestionsProps) {
  if (keywords.length === 0) return null;

  const existing = new Set(existingKeywords.map((k) => k.toLowerCase()));
  const missing = keywords.filter((k) => !existing.has(k.toLowerCase()));
  const added = keywords.filter((k) => existing.has(k.toLowerCase()));

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <h3 className="font-medium text-sm text-amber-800 dark:text-amber-300">
          {missing.length > 0
            ? `${missing.length} missing keyword${missing.length !== 1 ? "s" : ""}`
            : "All keywords present!"}
        </h3>
        {jobTitle && (
          <span className="text-xs text-amber-600/80 dark:text-amber-400/60">from {jobTitle}</span>
        )}
      </div>

      {missing.length > 0 && (
        <>
          <p className="text-xs text-amber-700 dark:text-amber-400/80">
            Click to add these keywords to your skills section:
          </p>
          <div className="flex flex-wrap gap-2">
            {missing.map((kw) => (
              <Button
                key={kw}
                size="sm"
                variant="outline"
                onClick={() => onAdd(kw)}
                className="h-7 text-xs gap-1 border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/40"
              >
                <Plus className="h-3 w-3" />
                {kw}
              </Button>
            ))}
          </div>
        </>
      )}

      {added.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {added.map((kw) => (
            <Badge
              key={kw}
              variant="outline"
              className="text-xs gap-1 text-green-600 border-green-300 dark:text-green-400 dark:border-green-700"
            >
              <CheckCircle2 className="h-2.5 w-2.5" />
              {kw}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
