"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, LogOut, LogIn, X, Send } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface NavbarProps {
  showBack?: boolean;
  breadcrumb?: string;
  children?: React.ReactNode;
}

export function Navbar({ showBack, breadcrumb, children }: NavbarProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatOpen) {
      inputRef.current?.focus();
    }
  }, [chatOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setChatOpen(false);
      }
    }
    if (chatOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [chatOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  return (
    <nav className="sticky top-0 z-50 h-14 border-b border-comprendo-border bg-comprendo-surface backdrop-blur-md">
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
          {/* ComprendoMan chat button */}
          <div className="relative" ref={popupRef}>
            <button
              onClick={() => setChatOpen((v) => !v)}
              className="flex items-center justify-center rounded-md p-1 transition-opacity hover:opacity-80"
              aria-label="Ask about the codebase"
            >
              <Image src="/logo/comprendoMan_red.svg" alt="Ask Comprendo" width={28} height={28} />
            </button>

            {chatOpen && (
              <div className="absolute right-0 top-10 z-50 w-72 rounded-xl border border-comprendo-border bg-comprendo-surface shadow-2xl">
                <div className="flex items-center justify-between border-b border-comprendo-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Image src="/logo/comprendoMan_red.svg" alt="Comprendo" width={20} height={20} />
                    <span className="text-sm font-medium text-comprendo-text">Ask about the codebase</span>
                  </div>
                  <button
                    onClick={() => setChatOpen(false)}
                    className="text-comprendo-muted transition-colors hover:text-comprendo-text"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-4">
                  <p className="mb-3 text-xs text-comprendo-muted">
                    Ask me anything about this codebase.
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      // backend hookup goes here
                      setChatInput("");
                    }}
                    className="flex items-center gap-2 rounded-lg border border-comprendo-border bg-comprendo-elevated px-3 py-2 focus-within:border-comprendo-accent"
                  >
                    <input
                      ref={inputRef}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask about the code..."
                      className="flex-1 bg-transparent text-sm text-comprendo-text placeholder:text-comprendo-faint focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="text-comprendo-accent transition-opacity disabled:opacity-30 hover:opacity-70"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>

          {children}
          {status === "loading" ? (
            <div className="h-7 w-7 animate-pulse rounded-full bg-comprendo-elevated" />
          ) : session ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center justify-center rounded-full ring-2 ring-transparent transition-all hover:ring-comprendo-accent"
                aria-label="User menu"
              >
                <Avatar className="h-7 w-7">
                  {session.user?.image && (
                    <AvatarImage src={session.user.image} alt={session.user.name ?? ""} />
                  )}
                  <AvatarFallback className="bg-comprendo-elevated text-xs text-comprendo-accent">
                    {session.user?.name?.[0]?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-10 z-50 w-48 rounded-xl border border-comprendo-border bg-comprendo-surface shadow-2xl">
                  <div className="border-b border-comprendo-border px-4 py-3">
                    <p className="text-sm font-medium text-comprendo-text truncate">
                      {session.user?.name ?? "User"}
                    </p>
                    {session.user?.email && (
                      <p className="text-xs text-comprendo-muted truncate">{session.user.email}</p>
                    )}
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-comprendo-muted transition-colors hover:bg-comprendo-elevated hover:text-comprendo-text"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
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
