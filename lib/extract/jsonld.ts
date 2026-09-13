import { extractJsonLdBlocks } from "../normalize";
import { extracted, type Extracted } from "../types";

/**
 * JSON-LD (schema.org JobPosting / Event) からの抽出。
 *
 * 構造化データは Source が自分で宣言した事実なので confidence: "high" として扱う。
 * 無ければ patterns.ts の正規表現にフォールバックする。
 */

interface JsonLdNode {
  "@type"?: string | string[];
  [key: string]: unknown;
}

function typesOf(node: JsonLdNode): string[] {
  const raw = node["@type"];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

/** @graph やネストした配列を平らにする */
function flatten(value: unknown, out: JsonLdNode[] = []): JsonLdNode[] {
  if (Array.isArray(value)) {
    for (const item of value) flatten(item, out);
    return out;
  }
  if (value && typeof value === "object") {
    const node = value as JsonLdNode;
    out.push(node);
    if ("@graph" in node) flatten(node["@graph"], out);
  }
  return out;
}

export function parseJsonLdNodes(html: string): JsonLdNode[] {
  const nodes: JsonLdNode[] = [];
  for (const block of extractJsonLdBlocks(html)) {
    try {
      flatten(JSON.parse(block), nodes);
    } catch {
      // 壊れた JSON-LD は無視する。推測して直さない。
    }
  }
  return nodes;
}

export interface JsonLdFacts {
  title: Extracted<string> | null;
  description: Extracted<string> | null;
  eventDate: Extracted<string> | null;
  eventEndDate: Extracted<string> | null;
  deadline: Extracted<string> | null;
  prefecture: Extracted<string> | null;
  city: Extracted<string> | null;
  address: Extracted<string> | null;
  employerName: Extracted<string> | null;
}

const EMPTY: JsonLdFacts = {
  title: null,
  description: null,
  eventDate: null,
  eventEndDate: null,
  deadline: null,
  prefecture: null,
  city: null,
  address: null,
  employerName: null
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asIsoDate(value: unknown): string | null {
  const raw = asString(value);
  if (!raw) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  return match ? match[0] : null;
}

function addressOf(node: JsonLdNode): Record<string, unknown> | null {
  const location = (node.jobLocation ?? node.location) as unknown;
  const first = Array.isArray(location) ? location[0] : location;
  if (!first || typeof first !== "object") return null;
  const address = (first as JsonLdNode).address ?? first;
  return address && typeof address === "object" ? (address as Record<string, unknown>) : null;
}

export function extractFromJsonLd(html: string): JsonLdFacts {
  const nodes = parseJsonLdNodes(html);
  const target = nodes.find((node) => {
    const types = typesOf(node).map((t) => t.toLowerCase());
    return types.includes("jobposting") || types.includes("event");
  });
  if (!target) return EMPTY;

  const source = "JSON-LD";
  const address = addressOf(target);

  const title = asString(target.title) ?? asString(target.name);
  const description = asString(target.description);
  const eventDate =
    asIsoDate(target.startDate) ?? asIsoDate(target.jobStartDate) ?? null;
  const eventEndDate = asIsoDate(target.endDate);
  const deadline = asIsoDate(target.validThrough) ?? asIsoDate(target.applicationDeadline);
  const region = address ? asString(address.addressRegion) : null;
  const locality = address ? asString(address.addressLocality) : null;
  const street = address ? asString(address.streetAddress) : null;
  const employer = target.hiringOrganization ?? target.organizer;
  const employerName =
    employer && typeof employer === "object"
      ? asString((employer as JsonLdNode).name)
      : asString(employer);

  return {
    title: title ? extracted(title, "high", `${source}: title`) : null,
    // description は HTML を含むことがあるのでタグを落とす
    description: description
      ? extracted(
          description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
          "high",
          `${source}: description`
        )
      : null,
    eventDate: eventDate ? extracted(eventDate, "high", `${source}: startDate`) : null,
    eventEndDate: eventEndDate ? extracted(eventEndDate, "high", `${source}: endDate`) : null,
    deadline: deadline ? extracted(deadline, "high", `${source}: validThrough`) : null,
    prefecture: region ? extracted(region, "high", `${source}: addressRegion`) : null,
    city: locality ? extracted(locality, "high", `${source}: addressLocality`) : null,
    address: street ? extracted(street, "high", `${source}: streetAddress`) : null,
    employerName: employerName
      ? extracted(employerName, "high", `${source}: hiringOrganization`)
      : null
  };
}
