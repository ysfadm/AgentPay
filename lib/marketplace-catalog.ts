import type { Agent, Service } from "./types";

export interface MarketplaceStoreSlice {
  agents: Agent[];
  services: Service[];
}

/** Add any catalog providers/services missing from a persisted store. */
export function mergeMarketplaceCatalog(store: MarketplaceStoreSlice): void {
  const agentIds = new Set(store.agents.map((a) => a.id));
  for (const provider of CATALOG_PROVIDERS) {
    if (!agentIds.has(provider.id)) {
      store.agents.push({ ...provider });
    }
  }

  const serviceIds = new Set(store.services.map((s) => s.id));
  for (const service of CATALOG_SERVICES) {
    if (!serviceIds.has(service.id)) {
      store.services.push({ ...service });
    }
  }
}

/** Default marketplace provider agents and their listings. Merged into the store on startup. */
export const CATALOG_PROVIDERS: Agent[] = [
  {
    id: "agent-data",
    name: "Data Provider Agent",
    role: "Sells real-time market data feeds.",
    avatarSeed: "data",
    walletAddress: "GDATA000000000000000000000000000000000000000000000000",
    reputationScore: 96,
    jobsCompleted: 132,
    successfulPayments: 127,
    isProvider: true,
  },
  {
    id: "agent-summarize",
    name: "Summarizer Agent",
    role: "Condenses long documents into briefings.",
    avatarSeed: "sum",
    walletAddress: "GSUM0000000000000000000000000000000000000000000000000",
    reputationScore: 91,
    jobsCompleted: 88,
    successfulPayments: 80,
    isProvider: true,
  },
  {
    id: "agent-translate",
    name: "Translator Agent",
    role: "Translates text between 30+ languages.",
    avatarSeed: "tr",
    walletAddress: "GTRA0000000000000000000000000000000000000000000000000",
    reputationScore: 88,
    jobsCompleted: 64,
    successfulPayments: 56,
    isProvider: true,
  },
  {
    id: "agent-image",
    name: "Image Generator Agent",
    role: "Creates visuals from text prompts.",
    avatarSeed: "img",
    walletAddress: "GIMG0000000000000000000000000000000000000000000000000",
    reputationScore: 94,
    jobsCompleted: 210,
    successfulPayments: 198,
    isProvider: true,
  },
  {
    id: "agent-code",
    name: "Code Review Agent",
    role: "Audits smart contracts and APIs.",
    avatarSeed: "code",
    walletAddress: "GCODE000000000000000000000000000000000000000000000000",
    reputationScore: 93,
    jobsCompleted: 76,
    successfulPayments: 71,
    isProvider: true,
  },
  {
    id: "agent-weather",
    name: "Weather Oracle Agent",
    role: "Hyperlocal weather and climate signals.",
    avatarSeed: "wx",
    walletAddress: "GWX00000000000000000000000000000000000000000000000000",
    reputationScore: 87,
    jobsCompleted: 54,
    successfulPayments: 49,
    isProvider: true,
  },
  {
    id: "agent-sentiment",
    name: "Sentiment Analyst Agent",
    role: "Tracks social and news sentiment.",
    avatarSeed: "sent",
    walletAddress: "GSENT000000000000000000000000000000000000000000000000",
    reputationScore: 89,
    jobsCompleted: 102,
    successfulPayments: 91,
    isProvider: true,
  },
  {
    id: "agent-schema",
    name: "Schema Builder Agent",
    role: "Turns descriptions into JSON schemas.",
    avatarSeed: "schema",
    walletAddress: "GSCH000000000000000000000000000000000000000000000000",
    reputationScore: 90,
    jobsCompleted: 45,
    successfulPayments: 42,
    isProvider: true,
  },
  {
    id: "agent-scraper",
    name: "Web Scraper Agent",
    role: "Extracts structured data from the web.",
    avatarSeed: "scrape",
    walletAddress: "GSCR000000000000000000000000000000000000000000000000",
    reputationScore: 85,
    jobsCompleted: 118,
    successfulPayments: 99,
    isProvider: true,
  },
  {
    id: "agent-email",
    name: "Email Drafter Agent",
    role: "Writes professional outreach emails.",
    avatarSeed: "mail",
    walletAddress: "GMAIL000000000000000000000000000000000000000000000000",
    reputationScore: 86,
    jobsCompleted: 67,
    successfulPayments: 58,
    isProvider: true,
  },
  {
    id: "agent-seo",
    name: "SEO Optimizer Agent",
    role: "Optimizes copy for search rankings.",
    avatarSeed: "seo",
    walletAddress: "GSEO0000000000000000000000000000000000000000000000000",
    reputationScore: 84,
    jobsCompleted: 39,
    successfulPayments: 33,
    isProvider: true,
  },
  {
    id: "agent-factcheck",
    name: "Fact Checker Agent",
    role: "Verifies claims against trusted sources.",
    avatarSeed: "fact",
    walletAddress: "GFACT000000000000000000000000000000000000000000000000",
    reputationScore: 92,
    jobsCompleted: 58,
    successfulPayments: 55,
    isProvider: true,
  },
];

export const CATALOG_SERVICES: Service[] = [
  {
    id: "svc-market-data",
    providerAgentId: "agent-data",
    providerName: "Data Provider Agent",
    providerReputation: 96,
    title: "Real-time Market Data Feed",
    description: "Live crypto + equities prices, delivered as JSON.",
    price: 2,
    category: "data",
  },
  {
    id: "svc-ohlcv",
    providerAgentId: "agent-data",
    providerName: "Data Provider Agent",
    providerReputation: 96,
    title: "Historical OHLCV Bundle",
    description: "30-day candle history for top 100 assets.",
    price: 1.5,
    category: "data",
  },
  {
    id: "svc-summary",
    providerAgentId: "agent-summarize",
    providerName: "Summarizer Agent",
    providerReputation: 91,
    title: "Document Summarization",
    description: "Summarize up to 50 pages into a one-page brief.",
    price: 1.5,
    category: "nlp",
  },
  {
    id: "svc-translate",
    providerAgentId: "agent-translate",
    providerName: "Translator Agent",
    providerReputation: 88,
    title: "Multilingual Translation",
    description: "Translate a document into any of 30+ languages.",
    price: 1,
    category: "nlp",
  },
  {
    id: "svc-image-gen",
    providerAgentId: "agent-image",
    providerName: "Image Generator Agent",
    providerReputation: 94,
    title: "AI Image Generation",
    description: "Generate a landing-page hero image from a text prompt.",
    price: 2.5,
    category: "creative",
  },
  {
    id: "svc-image-variations",
    providerAgentId: "agent-image",
    providerName: "Image Generator Agent",
    providerReputation: 94,
    title: "Image Style Variations",
    description: "Four style variants of an existing concept.",
    price: 1.8,
    category: "creative",
  },
  {
    id: "svc-contract-audit",
    providerAgentId: "agent-code",
    providerName: "Code Review Agent",
    providerReputation: 93,
    title: "Smart Contract Audit",
    description: "Static analysis + vulnerability report for Soroban contracts.",
    price: 3,
    category: "dev",
  },
  {
    id: "svc-api-scan",
    providerAgentId: "agent-code",
    providerName: "Code Review Agent",
    providerReputation: 93,
    title: "API Security Scan",
    description: "OWASP-style scan of a REST API surface.",
    price: 2,
    category: "dev",
  },
  {
    id: "svc-weather",
    providerAgentId: "agent-weather",
    providerName: "Weather Oracle Agent",
    providerReputation: 87,
    title: "Hyperlocal Weather Feed",
    description: "Hourly forecast + alerts for a lat/lng coordinate.",
    price: 0.5,
    category: "data",
  },
  {
    id: "svc-sentiment",
    providerAgentId: "agent-sentiment",
    providerName: "Sentiment Analyst Agent",
    providerReputation: 89,
    title: "Social Sentiment Report",
    description: "Brand sentiment score from social + news mentions.",
    price: 1.2,
    category: "analytics",
  },
  {
    id: "svc-schema",
    providerAgentId: "agent-schema",
    providerName: "Schema Builder Agent",
    providerReputation: 90,
    title: "JSON Schema from Description",
    description: "Generate a validated JSON Schema from plain English.",
    price: 1,
    category: "dev",
  },
  {
    id: "svc-scrape",
    providerAgentId: "agent-scraper",
    providerName: "Web Scraper Agent",
    providerReputation: 85,
    title: "Structured Web Extract",
    description: "Scrape a URL and return clean JSON records.",
    price: 1.8,
    category: "data",
  },
  {
    id: "svc-email",
    providerAgentId: "agent-email",
    providerName: "Email Drafter Agent",
    providerReputation: 86,
    title: "Professional Email Draft",
    description: "Cold outreach or follow-up email from bullet points.",
    price: 0.8,
    category: "nlp",
  },
  {
    id: "svc-seo",
    providerAgentId: "agent-seo",
    providerName: "SEO Optimizer Agent",
    providerReputation: 84,
    title: "SEO Content Optimization",
    description: "Rewrite a page for target keywords + meta tags.",
    price: 1.5,
    category: "nlp",
  },
  {
    id: "svc-factcheck",
    providerAgentId: "agent-factcheck",
    providerName: "Fact Checker Agent",
    providerReputation: 92,
    title: "Claim Verification",
    description: "Fact-check a paragraph with cited sources.",
    price: 1.3,
    category: "analytics",
  },
];

export const CATALOG_PROVIDER_IDS = new Set(CATALOG_PROVIDERS.map((p) => p.id));

export function isCatalogProvider(agentId: string): boolean {
  return CATALOG_PROVIDER_IDS.has(agentId);
}
