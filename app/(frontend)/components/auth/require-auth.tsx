"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/app/(frontend)/providers/auth-provider";
import { Skeleton } from "@/app/(frontend)/components/ui/skeleton";

interface RequireAuthProps {
  children: React.ReactNode;
  /** Rôle(s) autorisé(s) — vérification exacte (pas hiérarchique). */
  role?: string | string[];
  fallback?: React.ReactNode;
}

function hasRequiredRole(userRole: string, required?: string | string[]): boolean {
  if (!required) return true;
  const roles = Array.isArray(required) ? required : [required];
  return roles.includes(userRole);
}

/**
 * Protège une section/page — redirige vers /login si non authentifié.
 * Vérifie que le rôle de l'utilisateur correspond exactement au(x) rôle(s) requis.
 */
export function RequireAuth({ children, role, fallback }: RequireAuthProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push(`/login?from=${encodeURIComponent(pathname)}`);
      return;
    }
    if (role && !hasRequiredRole(user.role, role)) {
      router.push("/");
    }
  }, [user, isLoading, router, pathname, role]);

  if (isLoading) {
    return fallback ?? (
      <div className="flex flex-col gap-4 p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (role && !hasRequiredRole(user.role, role)) return null;

  return <>{children}</>;
}
