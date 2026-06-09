import { describe, expect, it } from "vitest";
import {
  inferCatalogFormat,
  normalizeCatalogItems,
  parseCatalogPayload,
} from "../catalog_import";

describe("catalog import helpers", () => {
  it("parses csv catalogs and normalizes common fields", () => {
    const payload = [
      "name,description,category,sku,price",
      "Starter Lamp,Soft ambient glow,Lighting,SKU-1,49.95",
    ].join("\n");

    const parsed = parseCatalogPayload(payload, "csv");
    const normalized = normalizeCatalogItems({
      items: parsed,
      sourceKey: "csv:test",
    });

    expect(normalized).toEqual([
      {
        name: "Starter Lamp",
        description: "Soft ambient glow",
        category: "Lighting",
        externalId: "SKU-1",
        metadata: { price: 49.95 },
      },
    ]);
  });

  it("parses nested json item arrays", () => {
    const parsed = parseCatalogPayload(
      JSON.stringify({
        items: [
          {
            title: "Signal Desk",
            summary: "Cable-managed workspace desk",
            collection: "Furniture",
            handle: "signal-desk",
            margin: "high",
          },
        ],
      }),
      "json"
    );

    const normalized = normalizeCatalogItems({
      items: parsed,
      sourceKey: "json:test",
    });

    expect(normalized[0]).toMatchObject({
      name: "Signal Desk",
      description: "Cable-managed workspace desk",
      category: "Furniture",
      externalId: "signal-desk",
      metadata: { margin: "high" },
    });
  });

  it("infers json format from content", () => {
    expect(inferCatalogFormat('[{\"name\":\"Desk\"}]')).toBe("json");
    expect(inferCatalogFormat("name,category\nDesk,Furniture")).toBe("csv");
  });
});
