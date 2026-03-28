"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, LogOut, LogIn } from "lucide-react";

interface NavbarProps {
  showBack?: boolean;
  breadcrumb?: string;
}

export function Navbar({ showBack, breadcrumb }: NavbarProps) {
  const router = useRouter();
  const { data: session, status } = useSession();

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
            <Image src="/logo/LogoMark_W.svg" alt="Comprendo" width={28} height={28} />
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
          {status === "loading" ? (
            <div className="h-7 w-20 animate-pulse rounded bg-comprendo-elevated" />
          ) : session ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  {session.user?.image && (
                    <AvatarImage src={session.user.image} alt={session.user.name ?? ""} />
                  )}
                  <AvatarFallback className="bg-comprendo-elevated text-xs text-comprendo-accent">
                    {session.user?.name?.[0]?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-comprendo-text">
                  {session.user?.name ?? session.user?.email}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/" })}
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
              onClick={() => signIn("github", { callbackUrl: "/repos" })}
              className="text-comprendo-muted hover:text-comprendo-text hover:bg-comprendo-elevated"
            >
              <LogIn className="mr-1.5 h-4 w-4" />
              Sign in with GitHub
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
