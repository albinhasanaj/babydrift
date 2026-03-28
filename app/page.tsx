"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import Image from "next/image";
import {
  ArrowRight,
  Network,
  FolderTree,
  Boxes,
  GitCommitHorizontal,
  GitBranch,
} from "lucide-react";

const features = [
  {
    icon: Network,
    title: "Mind Maps",
    description:
      "Visualize code relationships as interactive mind maps that reveal your project's architecture at a glance.",
  },
  {
    icon: FolderTree,
    title: "Folder Structure",
    description:
      "Navigate your codebase with a dynamic, explorable tree view that makes sense of complex directory layouts.",
  },
  {
    icon: Boxes,
    title: "Dependency Graphs",
    description:
      "Track package dependencies and module connections with clear, visual dependency mapping.",
  },
  {
    icon: GitCommitHorizontal,
    title: "Git Activity",
    description:
      "See your team's commit history come alive with visual timelines and contribution patterns.",
  },
  {
    icon: GitBranch,
    title: "Component Hierarchy",
    description:
      "Understand component relationships and data flow through auto-generated hierarchy views.",
  },
];

const steps = [
  {
    number: "01",
    title: "Connect your repo",
    description:
      "Link your GitHub repository in seconds. We analyze your code structure automatically.",
  },
  {
    number: "02",
    title: "Choose a visualization",
    description:
      "Pick from mind maps, dependency graphs, folder trees, and more — each revealing different insights.",
  },
  {
    number: "03",
    title: "Ask the AI",
    description:
      "Chat with our AI assistant to get instant explanations about any part of your codebase.",
  },
];

export default function Home() {
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    if (session) router.replace("/repos");
  }, [session, router]);

  return (
    <div
      className="min-h-screen text-foreground"
      style={{
        background: "linear-gradient(180deg, #c62a00 0%, #e84a00 20%, #f07000 40%, #f89000 60%, #ffa830 80%, #ffc060 100%)",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-4">
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
          onClick={() => router.push("/repos")}
          className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-heading font-bold hover:bg-primary/90 transition-colors"
        >
          Open App
        </button>
      </nav>

      {/* Hero */}
      <section
        className="flex flex-col items-center justify-center text-center px-6"
        style={{ minHeight: "calc(100vh - 80px)" }}
      >
        <h1 className="text-5xl md:text-7xl font-heading font-extrabold tracking-tight leading-[1.1] mb-10">
          Comprendo?
        </h1>
        <button
          onClick={() => router.push("/repos")}
          className="group flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-primary text-primary-foreground text-base font-heading font-bold hover:bg-primary/90 transition-all hover:gap-3"
        >
          Get started
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </section>

      {/* Lower content — dark card */}
      <div className="px-6 py-10">
        <div className="max-w-6xl mx-auto bg-background/90 backdrop-blur-sm rounded-3xl border border-border/50 px-8 py-16">
          {/* Features */}
          <section className="mb-20">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-center mb-4">
                Five ways to see your code
              </h2>
              <p className="text-muted-foreground text-center mb-14 max-w-lg mx-auto">
                Each visualization reveals a different layer of understanding.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {features.map((feature) => (
                  <div
                    key={feature.title}
                    className="p-6 rounded-2xl border border-border bg-secondary hover:border-primary/40 transition-colors group"
                  >
                    <feature.icon className="w-8 h-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
                    <h3 className="text-lg font-heading font-bold mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How it works */}
          <section className="mb-10">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-center mb-14">
                How it works
              </h2>
              <div className="space-y-10">
                {steps.map((step) => (
                  <div key={step.number} className="flex gap-6 items-start">
                    <span className="text-3xl font-heading font-extrabold text-primary/30 select-none flex-shrink-0 w-12">
                      {step.number}
                    </span>
                    <div>
                      <h3 className="text-xl font-heading font-bold mb-1">
                        {step.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
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
