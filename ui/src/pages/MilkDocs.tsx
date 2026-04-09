import { useEffect } from "react";
import { BookOpen } from "lucide-react";
import { useBreadcrumbs } from "../context/BreadcrumbContext";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 md:p-6 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed flex flex-col gap-2">
        {children}
      </div>
    </div>
  );
}

export function MilkDocs() {
  const { setBreadcrumbs } = useBreadcrumbs();
  useEffect(() => { setBreadcrumbs([{ label: "Documentation" }]); }, [setBreadcrumbs]);

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div className="flex items-center gap-2.5">
        <BookOpen className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-base font-semibold text-foreground">Mi1k Documentation</h1>
      </div>

      <Section title="What is Mi1k?">
        <p>
          Mi1k is your private AI workforce. It installs on your own machines, reads from a shared Brand Brain,
          and runs AI agents that handle real business work — from marketing to operations to sales.
        </p>
        <p>
          Every agent knows your brand cold, works in the background, and never sends data to anyone else's cloud.
          You stay in control with approval gates, token budgets, and full audit trails.
        </p>
      </Section>

      <Section title="Core Concepts">
        <p><strong>Agents</strong> — AI team members assigned to roles (CEO, CMO, CTO, etc.). Each agent has a personality (SOUL.md), tools, and a set of tasks to work on. They wake up on heartbeats, do their work, and report back.</p>
        <p><strong>Brand Brain</strong> — The shared knowledge base that every agent reads from. Contains your company identity, ideal customer profile, products &amp; services, tone of voice, and any uploaded brand materials. Built during onboarding and grows as agents learn.</p>
        <p><strong>Heartbeats</strong> — Scheduled cycles where agents wake up, check their tasks, execute work, and go back to sleep. Each heartbeat produces a run with logs, token usage, and outputs.</p>
        <p><strong>Approval Gates</strong> — Safety guardrails. For risky actions (sending emails, making API calls, spending money), agents pause and ask for your approval before proceeding.</p>
        <p><strong>Tasks</strong> — Work items assigned to agents. Created by you, by other agents, or automatically from routines. Each task has a status, priority, and execution history.</p>
        <p><strong>Projects</strong> — Group related tasks together. Each project can have its own workspace with files and configuration.</p>
        <p><strong>Routines</strong> — Recurring task templates. Set a schedule and agents will automatically create and execute tasks on that cadence.</p>
      </Section>

      <Section title="Getting Started">
        <p><strong>1. Onboarding</strong> — Create your company, upload brand materials (PDFs, docs, website URLs), and Mi1k builds your Brand Brain automatically.</p>
        <p><strong>2. Agents</strong> — Add agents for each function. The CEO agent coordinates, specialists execute. Each agent gets personality, tools, and instruction files.</p>
        <p><strong>3. First Task</strong> — Create a task and assign it to an agent. Watch it execute on the next heartbeat. Review the output, approve or reject.</p>
        <p><strong>4. Daily Use</strong> — Agents message you via the dashboard (or WhatsApp if configured). You approve, reject, or redirect. The Brand Brain grows as agents learn from each session.</p>
      </Section>

      <Section title="How It Works">
        <p><strong>Agent Instructions</strong> — Each agent reads from an instruction folder containing AGENTS.md (entry), SOUL.md (personality), HEARTBEAT.md (execution checklist), and CONTEXT.md (dynamically injected current tasks + relevant knowledge).</p>
        <p><strong>Session Management</strong> — Agent sessions accumulate context over time. When sessions get too large (high token cost), the middleware automatically extracts key decisions and knowledge, saves them to the Brand Brain, and starts the agent fresh.</p>
        <p><strong>Context Injection</strong> — The middleware polls every 60 seconds, checks active tasks, searches the Brand Brain for relevant knowledge, and writes a compact CONTEXT.md to each agent's instruction folder. Agents pick it up on their next heartbeat.</p>
        <p><strong>Documents</strong> — Agents produce documents (plans, reports, analyses) attached to tasks. These are versioned and searchable from the Documents page.</p>
      </Section>

      <Section title="Key Pages">
        <p><strong>Dashboard</strong> — Overview of live agent runs, recent activity, and company health.</p>
        <p><strong>Tasks</strong> — All work items across agents. Filter by status, assignee, project.</p>
        <p><strong>Agents</strong> — Configure agents, view their runs, manage instructions and skills.</p>
        <p><strong>Brand Brain</strong> — View and manage the shared knowledge base. Upload new materials, see what agents have learned.</p>
        <p><strong>Documents</strong> — Agent-produced documents and uploaded assets.</p>
        <p><strong>Costs</strong> — Token usage and spend tracking per agent and per run.</p>
        <p><strong>Activity</strong> — Full audit log of everything that happened.</p>
      </Section>

      <Section title="Architecture">
        <p><strong>Server</strong> — Node.js + Express + PostgreSQL. Manages agents, tasks, heartbeats, and the API.</p>
        <p><strong>Agents</strong> — Run via Claude Code CLI (claude-local adapter). Each agent is a Claude session with tools, instructions, and a task queue.</p>
        <p><strong>Middleware</strong> — Background daemon that handles session rotation, wiki seeding, and context injection. Keeps the Brand Brain alive and agents efficient.</p>
        <p><strong>UI</strong> — React + Tailwind + React Query. Real-time updates via polling.</p>
      </Section>
    </div>
  );
}
