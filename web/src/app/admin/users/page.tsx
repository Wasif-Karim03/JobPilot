"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Search, User, Briefcase, ClipboardList, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc-client";
import { useDebounce } from "@/hooks/use-debounce";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = trpc.admin.listUsers.useQuery({
    search: debouncedSearch || undefined,
    page,
    pageSize: 20,
  });

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        {data && (
          <span className="text-sm text-muted-foreground">
            {data.totalCount.toLocaleString()} total
          </span>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">All Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data?.users.length ? (
            <div className="p-8 text-center text-muted-foreground">
              <User className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No users found</p>
            </div>
          ) : (
            <div className="divide-y">
              {/* Header */}
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
                <span>User</span>
                <span>Role</span>
                <span>Onboarded</span>
                <span className="hidden lg:block">Jobs</span>
                <span className="hidden lg:block">Applications</span>
                <span>Joined</span>
              </div>
              {data.users.map((user) => (
                <div
                  key={user.id}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 items-center hover:bg-muted/30 transition-colors text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{user.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <div>
                    {user.role === "ADMIN" ? (
                      <Badge variant="destructive" className="text-xs">Admin</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">User</Badge>
                    )}
                  </div>
                  <div>
                    {user.onboardingComplete ? (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">Yes</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">No</Badge>
                    )}
                  </div>
                  <span className="hidden lg:flex items-center gap-1 text-muted-foreground">
                    <Briefcase className="h-3 w-3" />
                    {user._count.jobs}
                  </span>
                  <span className="hidden lg:flex items-center gap-1 text-muted-foreground">
                    <ClipboardList className="h-3 w-3" />
                    {user._count.applications}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page} of {data.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
