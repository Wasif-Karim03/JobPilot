"use client";

import { Search, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export interface JobFilters {
  search: string;
  status: string;
  minMatchScore: number;
  sortBy: string;
  sortDir: string;
}

interface JobFiltersBarProps {
  filters: JobFilters;
  onChange: (filters: Partial<JobFilters>) => void;
  onReset: () => void;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "DISCOVERED", label: "Discovered" },
  { value: "BOOKMARKED", label: "Bookmarked" },
  { value: "APPLYING", label: "Applying" },
  { value: "APPLIED", label: "Applied" },
  { value: "PHONE_SCREEN", label: "Phone Screen" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "OFFER", label: "Offer" },
  { value: "REJECTED", label: "Rejected" },
];

const SORT_OPTIONS = [
  { value: "discoveredAt_desc", label: "Newest first" },
  { value: "discoveredAt_asc", label: "Oldest first" },
  { value: "matchScore_desc", label: "Best match" },
  { value: "company_asc", label: "Company A–Z" },
];

export function JobFiltersBar({ filters, onChange, onReset }: JobFiltersBarProps) {
  const hasActiveFilters =
    filters.status !== "all" || filters.minMatchScore > 0 || filters.search !== "";

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search jobs..."
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          className="pl-9 h-9"
        />
        {filters.search && (
          <button
            onClick={() => onChange({ search: "" })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Sort */}
      <Select
        value={`${filters.sortBy}_${filters.sortDir}`}
        onValueChange={(v) => {
          if (!v) return;
          const [sortBy, sortDir] = v.split("_");
          onChange({ sortBy, sortDir });
        }}
      >
        <SelectTrigger className="w-36 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Filter sheet */}
      <Sheet>
        <SheetTrigger className="inline-flex items-center gap-2 h-9 px-3 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="h-4 w-4 p-0 flex items-center justify-center text-xs rounded-full">
              •
            </Badge>
          )}
        </SheetTrigger>

        <SheetContent>
          <SheetHeader>
            <SheetTitle>Filter Jobs</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(v) => v && onChange({ status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Min match score */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Minimum match score</Label>
                <span className="text-sm font-medium">{filters.minMatchScore}%</span>
              </div>
              <Slider
                min={0}
                max={100}
                step={5}
                value={[filters.minMatchScore]}
                onValueChange={(vals) => onChange({ minMatchScore: (vals as number[])[0] })}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Any</span>
                <span>80%+</span>
              </div>
            </div>

            {/* Reset */}
            {hasActiveFilters && (
              <Button variant="outline" className="w-full" onClick={onReset}>
                Reset filters
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Active filter chips */}
      {filters.status !== "all" && (
        <Badge variant="secondary" className="gap-1 h-7">
          {filters.status.replace(/_/g, " ")}
          <X className="h-3 w-3 cursor-pointer" onClick={() => onChange({ status: "all" })} />
        </Badge>
      )}
      {filters.minMatchScore > 0 && (
        <Badge variant="secondary" className="gap-1 h-7">
          ≥{filters.minMatchScore}% match
          <X className="h-3 w-3 cursor-pointer" onClick={() => onChange({ minMatchScore: 0 })} />
        </Badge>
      )}
    </div>
  );
}
