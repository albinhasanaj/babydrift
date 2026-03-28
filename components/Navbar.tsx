"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, LogOut } from "lucide-react";

interface NavbarProps {
  showBack?: boolean;
  breadcrumb?: string;
}

export function Navbar({ showBack, breadcrumb }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthenticated = pathname.startsWith("/repos") || pathname.startsWith("/repo/");

  return (
    <nav className="sticky top-0 z-50 h-14 border-b border-comprendo-border bg-comprendo-bg/80 backdrop-blur-md">
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center rounded-md p-1.5 text-comprendo-muted transition-colors hover:text-comprendo-text"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-comprendo-primary">
              <span className="text-sm font-bold text-white">C</span>
            </div>
            <span className="text-lg font-semibold text-comprendo-text">Comprendo</span>
          </Link>
          {breadcrumb && (
            <>
              <span className="text-comprendo-faint">/</span>
              <span className="text-sm text-comprendo-muted">{breadcrumb}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-comprendo-elevated text-xs text-comprendo-accent">
                    D
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-comprendo-text">demo</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/")}
                className="text-comprendo-muted hover:text-comprendo-text hover:bg-comprendo-elevated"
              >
                <LogOut className="mr-1 h-3.5 w-3.5" />
                Sign out
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/repos")}
              className="text-comprendo-muted hover:text-comprendo-text hover:bg-comprendo-elevated"
            >
              Sign in with GitHub
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
