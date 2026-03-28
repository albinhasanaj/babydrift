"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import {
  ArrowRight,
  ArrowDown,
  Network,
  FolderTree,
  Boxes,
  GitCommitHorizontal,
  GitBranch,
  ChevronLeft,
  ChevronRight,
  GitFork,
  Link2,
  GitPullRequest,
} from "lucide-react";

const features = [
  {
    icon: Network,
    title: "Mind Maps",
    description: "Visualize code relationships as interactive mind maps.",
  },
  {
    icon: FolderTree,
    title: "Folder Structure",
    description: "Navigate your codebase with a dynamic tree view.",
  },
  {
    icon: Boxes,
    title: "Dependency Graphs",
    description: "Track package dependencies with visual mapping.",
  },
  {
    icon: GitCommitHorizontal,
    title: "Git Activity",
    description: "See commit history with visual timelines.",
  },
  {
    icon: GitBranch,
    title: "Component Hierarchy",
    description: "Understand component relationships and data flow.",
  },
];

export default function Home() {
  const router = useRouter();
  const { data: session } = useSession();
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    if (session) router.replace("/repos");
  }, [session, router]);

  const scrollFeatures = (dir: number) => {
    setActiveFeature(
      (prev) => (prev + dir + features.length) % features.length
    );
  };

  const visibleFeatureIndexes = [-1, 0, 1].map(
    (offset) => (activeFeature + offset + features.length) % features.length
  );

  return (
    <div className="min-h-screen text-foreground relative overflow-hidden">
      {/* Background image */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: "url('/bg/gradient-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      />

      {/* Navbar */}
      <nav className="relative flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo/LogoMark_W.svg"
            alt="Comprendo logo"
            width={28}
            height={28}
          />
          <span className="text-xl font-heading font-extrabold tracking-tight">
            Comprendo.
          </span>
        </div>
        <button
          onClick={() => signIn("github", { callbackUrl: "/repos" })}
          className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-heading font-bold hover:bg-primary/90 transition-colors"
        >
          Open App
        </button>
      </nav>

      {/* Hero */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-6"
        style={{ minHeight: "calc(100vh - 160px)" }}
      >
        <p className="uppercase tracking-[0.3em] text-sm font-heading font-bold text-white/80 mb-6">
          Code Visualization Platform
        </p>
        <h1 className="text-6xl md:text-8xl lg:text-9xl font-heading font-extrabold tracking-tight leading-[1.05] mb-8">
          Comprendo?
        </h1>
        <p className="text-base md:text-lg font-mono text-white/80 mb-1">
          Transform any GitHub repo into interactive visual maps.
        </p>
        <p className="text-base md:text-lg font-mono text-white/70 mb-10">
          Understand architecture, dependencies, and flow — instantly.
        </p>
        <div className="flex items-center gap-6">
          <button
            onClick={() => signIn("github", { callbackUrl: "/repos" })}
            className="group flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-primary text-primary-foreground text-base font-heading font-bold hover:bg-primary/90 transition-all hover:gap-3"
          >
            Get started free
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
          </button>
          <a
            href="#features"
            className="text-sm font-mono text-white/70 hover:text-white transition-colors"
          >
            See how it works ↓
          </a>
        </div>
      </section>

      {/* Lower content — solid background */}
      <div className="relative px-6 py-10">
        <div className="max-w-6xl mx-auto rounded-3xl border border-border/50 px-8 pt-6 pb-16" style={{ backgroundColor: "#1a1a1a" }}>
          {/* Arrow down indicator */}
          <div className="flex justify-center mb-10">
            <ArrowDown className="w-5 h-5 text-muted-foreground animate-bounce" />
          </div>

          {/* Features — horizontal circular slideshow */}
          <section id="features" className="mb-20">
            <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-center mb-10">
              Five ways to see your code
            </h2>

            <div className="relative">
              <button
                onClick={() => scrollFeatures(-1)}
                className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center hover:border-primary/40 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scrollFeatures(1)}
                className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center hover:border-primary/40 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div className="mx-6">
                <div className="grid grid-cols-3 gap-4">
                  {visibleFeatureIndexes.map((featureIndex, position) => {
                    const feature = features[featureIndex];
                    const isCenter = position === 1;

                    return (
                      <div
                        key={`${feature.title}-${position}`}
                        onClick={() => setActiveFeature(featureIndex)}
                        className="relative cursor-pointer"
                      >
                        {isCenter && (
                          <div
                            className="absolute -inset-[1px] rounded-2xl pointer-events-none"
                            style={{
                              background:
                                "linear-gradient(135deg, var(--primary), var(--accent), var(--primary))",
                            }}
                          />
                        )}

                        <div
                          className={`relative min-h-[176px] p-6 rounded-2xl border transition-all duration-300 ${
                            isCenter
                              ? "border-transparent bg-secondary"
                              : "border-border bg-secondary/60 opacity-80 hover:opacity-95"
                          }`}
                        >
                          <feature.icon
                            className={`w-8 h-8 mb-3 transition-colors ${
                              isCenter
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                          <h3 className="text-base font-heading font-bold mb-2 min-h-[1.5rem]">
                            {feature.title}
                          </h3>
                          <p className="text-xs text-muted-foreground leading-relaxed min-h-[2.5rem]">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-center gap-2 mt-6">
                {features.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveFeature(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === activeFeature
                        ? "bg-primary w-6"
                        : "bg-border hover:bg-muted-foreground"
                    }`}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Simplified Demo Preview */}
          <section className="mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-center mb-10">
              See it in action
            </h2>

            {/* Mac window chrome */}
            <div className="rounded-2xl border border-border overflow-hidden">
              {/* Title bar with dots and address */}
              <div className="h-10 bg-background flex items-center px-4 gap-3 border-b border-border">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: "#FF5F57" }}
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: "#FEBC2E" }}
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: "#28C840" }}
                  />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 rounded-md bg-secondary text-[11px] text-muted-foreground font-mono">
                    comprendo.dev
                  </div>
                </div>
                <div className="w-[54px]" />
              </div>

              {/* App content */}
              <div className="relative bg-secondary/40" style={{ height: 300 }}>
                {/* Minimal sidebar */}
                <div className="absolute left-0 top-0 bottom-0 w-12 bg-background/50 border-r border-border flex flex-col items-center py-4 gap-3">
                  {features.map((f, i) => (
                    <div
                      key={f.title}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                        i === activeFeature
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground/50"
                      }`}
                    >
                      <f.icon className="w-3.5 h-3.5" />
                    </div>
                  ))}
                </div>

                {/* Canvas area */}
                <div className="absolute left-12 top-0 right-0 bottom-0">
                  {/* App top bar */}
                  <div className="h-9 border-b border-border/50 flex items-center px-4 gap-2">
                    <Image
                      src="/logo/LogoMark_W.svg"
                      alt=""
                      width={14}
                      height={14}
                      className="opacity-40"
                    />
                    <span className="text-[10px] font-heading font-bold text-muted-foreground/50">
                      Comprendo.
                    </span>
                  </div>

                  {/* Horizontal mind map — left to right layout */}
                  <svg
                    className="w-full"
                    style={{ height: "calc(100% - 36px)" }}
                    viewBox="0 0 600 260"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    {/* Connections — left to right */}
                    <line
                      x1="130"
                      y1="130"
                      x2="240"
                      y2="70"
                      stroke="var(--border)"
                      strokeWidth="1.5"
                    />
                    <line
                      x1="130"
                      y1="130"
                      x2="240"
                      y2="130"
                      stroke="var(--border)"
                      strokeWidth="1.5"
                    />
                    <line
                      x1="130"
                      y1="130"
                      x2="240"
                      y2="190"
                      stroke="var(--border)"
                      strokeWidth="1.5"
                    />
                    <line
                      x1="340"
                      y1="70"
                      x2="440"
                      y2="45"
                      stroke="var(--border)"
                      strokeWidth="1"
                      opacity="0.4"
                    />
                    <line
                      x1="340"
                      y1="70"
                      x2="440"
                      y2="95"
                      stroke="var(--border)"
                      strokeWidth="1"
                      opacity="0.4"
                    />

                    {/* Root node */}
                    <rect
                      x="60"
                      y="115"
                      width="140"
                      height="30"
                      rx="15"
                      fill="var(--primary)"
                    />
                    <text
                      x="130"
                      y="134"
                      textAnchor="middle"
                      fill="var(--primary-foreground)"
                      fontSize="12"
                      fontFamily="monospace"
                      fontWeight="600"
                    >
                      src/
                    </text>

                    {/* Middle nodes */}
                    <rect
                      x="230"
                      y="55"
                      width="120"
                      height="30"
                      rx="15"
                      fill="var(--secondary)"
                      stroke="var(--border)"
                      strokeWidth="1"
                    />
                    <text
                      x="290"
                      y="74"
                      textAnchor="middle"
                      fill="var(--foreground)"
                      fontSize="11"
                      fontFamily="monospace"
                    >
                      components/
                    </text>

                    <rect
                      x="230"
                      y="115"
                      width="120"
                      height="30"
                      rx="15"
                      fill="var(--secondary)"
                      stroke="var(--border)"
                      strokeWidth="1"
                    />
                    <text
                      x="290"
                      y="134"
                      textAnchor="middle"
                      fill="var(--foreground)"
                      fontSize="11"
                      fontFamily="monospace"
                    >
                      pages/
                    </text>

                    <rect
                      x="230"
                      y="175"
                      width="120"
                      height="30"
                      rx="15"
                      fill="var(--secondary)"
                      stroke="var(--border)"
                      strokeWidth="1"
                    />
                    <text
                      x="290"
                      y="194"
                      textAnchor="middle"
                      fill="var(--foreground)"
                      fontSize="11"
                      fontFamily="monospace"
                    >
                      hooks/
                    </text>

                    {/* Leaf nodes — faded */}
                    <rect
                      x="430"
                      y="30"
                      width="100"
                      height="28"
                      rx="14"
                      fill="var(--secondary)"
                      stroke="var(--border)"
                      strokeWidth="0.8"
                      opacity="0.4"
                    />
                    <text
                      x="480"
                      y="48"
                      textAnchor="middle"
                      fill="var(--muted-foreground)"
                      fontSize="10"
                      fontFamily="monospace"
                      opacity="0.5"
                    >
                      Nav.tsx
                    </text>

                    <rect
                      x="430"
                      y="80"
                      width="100"
                      height="28"
                      rx="14"
                      fill="var(--secondary)"
                      stroke="var(--border)"
                      strokeWidth="0.8"
                      opacity="0.4"
                    />
                    <text
                      x="480"
                      y="98"
                      textAnchor="middle"
                      fill="var(--muted-foreground)"
                      fontSize="10"
                      fontFamily="monospace"
                      opacity="0.5"
                    >
                      Sidebar.tsx
                    </text>
                  </svg>
                </div>
              </div>
            </div>
          </section>

          {/* GitHub Connection Section */}
          <section className="mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-center mb-4">
              Connect your GitHub
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-lg mx-auto">
              Link your repository and start visualizing in seconds.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-secondary/60 border border-border">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <GitFork className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-sm font-heading font-bold mb-2">
                  1. Connect
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Open project settings and authorize the Comprendo GitHub App.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-secondary/60 border border-border">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Link2 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-sm font-heading font-bold mb-2">
                  2. Sync
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your repo syncs automatically — push changes and see them
                  instantly.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-secondary/60 border border-border">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <GitPullRequest className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-sm font-heading font-bold mb-2">
                  3. Explore
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Visualize branches, commits, and structure — all in real time.
                </p>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="border-t border-border/50 pt-6 flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-heading font-bold text-foreground">
              Comprendo.
            </span>
            <span>© {new Date().getFullYear()} All rights reserved.</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
