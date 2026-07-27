/** Demo catalog — simulates agents discovered in an OpenClaw workspace. */
export interface OpenClawAgent {
  id: string;
  name: string;
  role: string;
  skills: string[];
  workspace: string;
}

export const OPENCLAW_WORKSPACE = "my-openclaw-workspace";

export const OPENCLAW_CATALOG: OpenClawAgent[] = [
  {
    id: "oc_sales_closer",
    name: "Sales Closer Bot",
    role: "Qualifies leads and drafts follow-up emails autonomously.",
    skills: ["email", "crm", "outreach"],
    workspace: OPENCLAW_WORKSPACE,
  },
  {
    id: "oc_research_scout",
    name: "Research Scout",
    role: "Monitors news and compiles daily market briefings.",
    skills: ["research", "summarize", "alerts"],
    workspace: OPENCLAW_WORKSPACE,
  },
  {
    id: "oc_dev_reviewer",
    name: "PR Review Agent",
    role: "Reviews pull requests and suggests security fixes.",
    skills: ["code-review", "security", "github"],
    workspace: OPENCLAW_WORKSPACE,
  },
  {
    id: "oc_support_triage",
    name: "Support Triage Bot",
    role: "Classifies tickets and routes them to the right team.",
    skills: ["support", "classification", "slack"],
    workspace: OPENCLAW_WORKSPACE,
  },
  {
    id: "oc_content_writer",
    name: "Content Pipeline Agent",
    role: "Turns bullet points into blog posts and social snippets.",
    skills: ["writing", "seo", "social"],
    workspace: OPENCLAW_WORKSPACE,
  },
];

export function getOpenClawAgent(id: string): OpenClawAgent | undefined {
  return OPENCLAW_CATALOG.find((a) => a.id === id);
}
