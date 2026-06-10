import { describe, expect, it } from "vitest";
import { parseStreamedEvents } from "../agent-service-client";

const event = (text: string) => ({ content: { parts: [{ text }] } });

describe("parseStreamedEvents", () => {
  it("parses newline-delimited JSON events", () => {
    const body = `${JSON.stringify(event("first"))}\n${JSON.stringify(event("second"))}\n`;
    const events = parseStreamedEvents(body);
    expect(events).toHaveLength(2);
    expect(events[1]?.content?.parts?.[0]?.text).toBe("second");
  });

  it("parses pretty-printed JSON spanning multiple lines", () => {
    const body = `${JSON.stringify(event("pretty"), null, 2)}\n${JSON.stringify(event("compact"))}`;
    const events = parseStreamedEvents(body);
    expect(events).toHaveLength(2);
    expect(events[0]?.content?.parts?.[0]?.text).toBe("pretty");
  });

  it("tolerates SSE data: framing", () => {
    const body = `data: ${JSON.stringify(event("sse"))}\n\ndata: ${JSON.stringify(event("sse2"))}\n`;
    const events = parseStreamedEvents(body);
    expect(events).toHaveLength(2);
    expect(events[0]?.content?.parts?.[0]?.text).toBe("sse");
  });

  it("flattens a JSON array body", () => {
    const body = JSON.stringify([event("a"), event("b")]);
    const events = parseStreamedEvents(body);
    expect(events).toHaveLength(2);
  });

  it("returns no events for an empty body", () => {
    expect(parseStreamedEvents("")).toHaveLength(0);
  });
});
