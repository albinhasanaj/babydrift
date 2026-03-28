"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, LogOut, LogIn, X, Send, Loader2, Link2, Copy, Check, Mail } from "lucide-react";
import { useState, useRef, useEffect, useCallback, FormEvent } from "react";

interface NodeRef {
  id: string;
  label: string;
  filePath: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
  nodeRef?: NodeRef;
}

interface NavbarProps {
  showBack?: boolean;
  breadcrumb?: string;
  children?: React.ReactNode;
  /** traceId of the currently explored repository — enables codebase Q&A */
  traceId?: string;
  /** Called when Gemini identifies a specific node in its answer */
  onHighlightNode?: (nodeId: string, filePath: string) => void;
}

export function Navbar({ showBack, breadcrumb, children, traceId, onHighlightNode }: NavbarProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatSending, setChatSending] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (chatOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [chatOpen]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false);
      }
    }
    if (shareOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [shareOpen]);

  const handleCopy = useCallback(() => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  const handleChatSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const q = chatInput.trim();
      if (!q || chatSending || !traceId) return;

      setChatInput("");
      setMessages((prev) => [...prev, { role: "user", text: q }]);
      setChatSending(true);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "", streaming: true },
      ]);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q, traceId }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          let errorMsg = "Failed to get an answer.";
          try {
            const errBody = await res.json();
            if (errBody?.error) errorMsg = errBody.error;
          } catch {}
          setMessages((prev) => [
            ...prev.slice(0, -1),
            { role: "assistant", text: errorMsg, streaming: false },
          ]);
          setChatSending(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          full += text;
          setMessages((prev) => [
            ...prev.slice(0, -1),
            { role: "assistant", text: full, streaming: true },
          ]);
        }

        // Parse optional node reference marker
        const markerMatch = full.match(/\n?__COMPRENDO_NODE__(\{[^}]+\})\s*$/);
        let nodeRef: NodeRef | undefined;
        let displayText = full;

        if (markerMatch) {
          try {
            const parsed = JSON.parse(markerMatch[1]);
            if (parsed.id && parsed.label && parsed.filePath) {
              nodeRef = { id: parsed.id, label: parsed.label, filePath: parsed.filePath };
              displayText = full.slice(0, full.indexOf(markerMatch[0])).trim();
              onHighlightNode?.(parsed.id, parsed.filePath);
            }
          } catch {
            // marker malformed — keep full text
          }
        }

        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", text: displayText, streaming: false, nodeRef },
        ]);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setMessages((prev) => [
            ...prev.slice(0, -1),
            { role: "assistant", text: "Something went wrong. Please try again.", streaming: false },
          ]);
        }
      } finally {
        setChatSending(false);
      }
    },
    [chatInput, chatSending, traceId, onHighlightNode]
  );

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
          {traceId && <div className="relative" ref={popupRef}>
            <button
              onClick={() => setChatOpen((v) => !v)}
              className="flex items-center justify-center rounded-md p-1 transition-opacity hover:opacity-80"
              aria-label="Ask about the codebase"
            >
              <Image src="/logo/comprendoMan_red.svg" alt="Ask Comprendo" width={28} height={28} />
            </button>

            {chatOpen && (
              <div className="absolute right-0 top-10 z-50 flex w-[380px] flex-col rounded-xl border border-comprendo-border bg-comprendo-surface shadow-2xl"
                style={{ maxHeight: "520px" }}>
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-comprendo-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Image src="/logo/comprendoMan_red.svg" alt="Comprendo" width={20} height={20} />
                    <span className="text-sm font-medium text-comprendo-text">Ask about the codebase</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {messages.length > 0 && (
                      <button
                        onClick={() => setMessages([])}
                        className="text-xs text-comprendo-faint transition-colors hover:text-comprendo-muted"
                        title="Clear conversation"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      onClick={() => setChatOpen(false)}
                      className="text-comprendo-muted transition-colors hover:text-comprendo-text"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-3" style={{ minHeight: 0 }}>
                  {messages.length === 0 && (
                    <p className="text-xs text-comprendo-muted">
                      {traceId
                        ? "Ask me anything about this codebase."
                        : "Open a repository to ask questions about its code."}
                    </p>
                  )}
                  <div className="flex flex-col gap-3">
                    {messages.map((msg, i) => (
                      <div key={i} className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                        <div
                          className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                            msg.role === "user"
                              ? "bg-comprendo-accent text-white"
                              : "bg-comprendo-elevated text-comprendo-text"
                          }`}
                        >
                          {msg.text}
                          {msg.streaming && (
                            <span
                              className="ml-0.5 inline-block h-3 w-0.5 align-text-bottom"
                              style={{ background: "#f97316", animation: "blink 1s step-end infinite" }}
                            />
                          )}
                        </div>
                        {msg.nodeRef && (
                          <button
                            onClick={() => {
                              onHighlightNode?.(msg.nodeRef!.id, msg.nodeRef!.filePath);
                              setChatOpen(false);
                            }}
                            className="flex items-center gap-1.5 rounded-lg border border-comprendo-accent/40 bg-comprendo-accent/10 px-2.5 py-1 text-[11px] text-comprendo-accent transition-colors hover:bg-comprendo-accent/20"
                          >
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5" />
                              <circle cx="5" cy="5" r="1.5" fill="currentColor" />
                            </svg>
                            View {msg.nodeRef.label}
                          </button>
                        )}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Input */}
                <div className="shrink-0 border-t border-comprendo-border p-3">
                  <form
                    onSubmit={handleChatSubmit}
                    className="flex items-center gap-2 rounded-lg border border-comprendo-border bg-comprendo-elevated px-3 py-2 focus-within:border-comprendo-accent"
                  >
                    <input
                      ref={inputRef}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={traceId ? "Ask about the code..." : "No repository loaded"}
                      disabled={!traceId || chatSending}
                      className="flex-1 bg-transparent text-sm text-comprendo-text placeholder:text-comprendo-faint focus:outline-none disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || !traceId || chatSending}
                      className="text-comprendo-accent transition-opacity disabled:opacity-30 hover:opacity-70"
                    >
                      {chatSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </form>
                </div>
                <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
              </div>
            )}
          </div>}

          {/* Share button */}
          {traceId && <div className="relative" ref={shareRef}>
            <button
              onClick={() => setShareOpen((v) => !v)}
              className="flex items-center justify-center rounded-md p-1.5 text-comprendo-muted transition-colors hover:text-comprendo-text"
              aria-label="Share this page"
            >
              <Link2 className="h-4 w-4" />
            </button>

            {shareOpen && (
              <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-comprendo-border bg-comprendo-surface shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-comprendo-border px-4 py-3">
                  <span className="text-sm font-semibold text-comprendo-text">Share</span>
                  <button
                    onClick={() => setShareOpen(false)}
                    className="text-comprendo-muted transition-colors hover:text-comprendo-text"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* URL row */}
                <div className="px-4 py-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2 rounded-lg border border-comprendo-border bg-comprendo-elevated px-3 py-2">
                    <Link2 className="h-3.5 w-3.5 shrink-0 text-comprendo-muted" />
                    <span className="flex-1 truncate text-xs text-comprendo-muted select-all">
                      {typeof window !== "undefined" ? window.location.href : ""}
                    </span>
                    <button
                      onClick={handleCopy}
                      className="shrink-0 flex items-center gap-1.5 rounded-md bg-comprendo-accent px-2.5 py-1 text-xs font-medium text-white transition-opacity hover:opacity-80"
                    >
                      {copied ? (
                        <><Check className="h-3 w-3" /> Copied</>
                      ) : (
                        <><Copy className="h-3 w-3" /> Copy</>
                      )}
                    </button>
                  </div>

                  {/* Share via */}
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={`mailto:?subject=Check%20this%20out&body=${typeof window !== "undefined" ? encodeURIComponent(window.location.href) : ""}`}
                      className="flex items-center justify-center gap-2 rounded-lg border border-comprendo-border bg-comprendo-elevated px-3 py-2 text-xs text-comprendo-muted transition-colors hover:border-comprendo-accent hover:text-comprendo-text"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Email
                    </a>
                    <a
                      href={`https://twitter.com/intent/tweet?url=${typeof window !== "undefined" ? encodeURIComponent(window.location.href) : ""}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 rounded-lg border border-comprendo-border bg-comprendo-elevated px-3 py-2 text-xs text-comprendo-muted transition-colors hover:border-comprendo-accent hover:text-comprendo-text"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      Twitter
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>}

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
