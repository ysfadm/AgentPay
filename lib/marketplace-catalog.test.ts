import { describe, it, expect } from "vitest";
import {
  CATALOG_PROVIDERS,
  CATALOG_SERVICES,
  mergeMarketplaceCatalog,
} from "./marketplace-catalog";

describe("marketplace catalog", () => {
  it("includes at least 10 provider agents", () => {
    expect(CATALOG_PROVIDERS.length).toBeGreaterThanOrEqual(10);
  });

  it("includes at least 12 services", () => {
    expect(CATALOG_SERVICES.length).toBeGreaterThanOrEqual(12);
  });

  it("merges missing catalog entries into an existing store", () => {
    const slice = {
      agents: [CATALOG_PROVIDERS[0]],
      services: [CATALOG_SERVICES[0]],
    };
    mergeMarketplaceCatalog(slice);
    expect(slice.agents.length).toBe(CATALOG_PROVIDERS.length);
    expect(slice.services.length).toBe(CATALOG_SERVICES.length);
  });
});
