import { z } from "zod";

const rawCatalogItemSchema = z.record(z.unknown());

export type ImportSourceType = "csv" | "json" | "url";

export interface NormalizedCatalogItem {
  name: string;
  description?: string;
  category?: string;
  externalId: string;
  metadata?: Record<string, unknown>;
}

export function inferCatalogFormat(
  content: string,
  explicitFormat?: "csv" | "json"
): "csv" | "json" {
  if (explicitFormat) return explicitFormat;
  const trimmed = content.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return "json";
  }
  return "csv";
}

export function parseCatalogPayload(
  content: string,
  format: "csv" | "json"
): Record<string, unknown>[] {
  return format === "json"
    ? parseJsonCatalog(content)
    : parseCsvCatalog(content);
}

function parseJsonCatalog(content: string): Record<string, unknown>[] {
  const parsed = JSON.parse(content) as unknown;

  if (Array.isArray(parsed)) {
    return parsed.map((item) => rawCatalogItemSchema.parse(item));
  }

  if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as { items?: unknown[] }).items)
  ) {
    return (parsed as { items: unknown[] }).items.map((item) =>
      rawCatalogItemSchema.parse(item)
    );
  }

  throw new Error("JSON import must be an array of products or an object with an items array.");
}

function parseCsvCatalog(content: string): Record<string, unknown>[] {
  const rows = tokenizeCsv(content);
  if (rows.length < 2) {
    throw new Error("CSV import requires a header row and at least one data row.");
  }

  const header = rows[0]!.map((cell) => normalizeColumnName(cell));
  return rows.slice(1).flatMap((row) => {
    const empty = row.every((cell) => !cell.trim());
    if (empty) return [];
    const record: Record<string, unknown> = {};
    header.forEach((column, index) => {
      record[column] = (row[index] ?? "").trim();
    });
    return [record];
  });
}

function tokenizeCsv(content: string): string[][] {
  const rows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < content.length; index++) {
    const char = content[index]!;
    const next = content[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        currentCell += "\"";
        index++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index++;
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  rows.push(currentRow);
  return rows;
}

function normalizeColumnName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

export function normalizeCatalogItems(params: {
  items: Record<string, unknown>[];
  sourceKey: string;
}): NormalizedCatalogItem[] {
  return params.items.map((item, index) => normalizeCatalogItem(item, params.sourceKey, index));
}

function normalizeCatalogItem(
  item: Record<string, unknown>,
  sourceKey: string,
  index: number
): NormalizedCatalogItem {
  const name =
    firstString(item, ["name", "title", "product_name", "product"])?.trim() ?? "";
  if (!name) {
    throw new Error("Every imported product needs a name or title column.");
  }

  const description = firstString(item, [
    "description",
    "body",
    "summary",
    "details",
  ])?.trim();
  const category = firstString(item, [
    "category",
    "type",
    "product_type",
    "collection",
  ])?.trim();

  const externalId =
    firstString(item, ["external_id", "externalid", "id", "sku", "handle"])?.trim() ??
    `${sourceKey}:${slugify(name)}:${index + 1}`;

  const reservedKeys = new Set([
    "name",
    "title",
    "product_name",
    "product",
    "description",
    "body",
    "summary",
    "details",
    "category",
    "type",
    "product_type",
    "collection",
    "external_id",
    "externalid",
    "id",
    "sku",
    "handle",
  ]);

  const metadataEntries = Object.entries(item).filter(
    ([key, value]) =>
      !reservedKeys.has(key) &&
      value !== "" &&
      value !== null &&
      value !== undefined
  );

  return {
    name,
    description: description || undefined,
    category: category || undefined,
    externalId,
    metadata:
      metadataEntries.length > 0
        ? Object.fromEntries(
            metadataEntries.map(([key, value]) => [key, coerceValue(value)])
          )
        : undefined,
  };
}

function firstString(
  item: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }
}

function coerceValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (!Number.isNaN(Number(trimmed)) && trimmed.length < 16) return Number(trimmed);

  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  return value;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
