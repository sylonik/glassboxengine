export const dynamic = "force-static";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "GlassBox Engine API",
    version: "0.1.0",
    description:
      "API for the GlassBox recommendation engine SDK. Authenticate with a Bearer token (API key) generated from the dashboard.",
  },
  servers: [
    {
      url: "{baseUrl}/api",
      variables: {
        baseUrl: {
          default: "http://localhost:3000",
          description: "Base URL of the GlassBox Engine deployment",
        },
      },
    },
  ],
  security: [{ BearerAuth: [] }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "API key generated from the GlassBox dashboard (gb_live_...)",
      },
    },
    schemas: {
      FeedItem: {
        type: "object",
        properties: {
          itemId: { type: "string", format: "uuid" },
          externalId: {
            type: ["string", "null"],
            description:
              "Your own product id (the catalog external_id you imported), for mapping feed items back onto your catalog.",
          },
          name: { type: "string" },
          description: { type: ["string", "null"] },
          category: { type: ["string", "null"] },
          score: { type: "number", minimum: 0, maximum: 1 },
          reasoning: { type: "string" },
          confidenceScore: { type: "number", minimum: 0, maximum: 1 },
          scoreBreakdown: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                weight: { type: "number" },
                rawValue: { type: "number" },
                weightedValue: { type: "number" },
                contribution: { type: "string" },
              },
              required: ["name", "weight", "rawValue", "weightedValue", "contribution"],
            },
          },
          matchedSignals: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["itemId", "externalId", "name", "description", "category", "score", "reasoning", "confidenceScore", "scoreBreakdown", "matchedSignals"],
      },
      ReasoningStep: {
        type: "object",
        properties: {
          agent: { type: "string" },
          action: { type: "string" },
          reasoning: { type: "string" },
        },
        required: ["agent", "action", "reasoning"],
      },
      PolicySpec: {
        type: "object",
        properties: {
          version: { type: "string" },
          sliders: { $ref: "#/components/schemas/Sliders" },
          constraints: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                value: { oneOf: [{ type: "string" }, { type: "number" }] },
                reason: { type: "string" },
              },
              required: ["type", "value", "reason"],
            },
          },
          author: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
        required: ["version", "sliders", "constraints", "author", "createdAt"],
      },
      RecommendationResponse: {
        type: "object",
        properties: {
          traceId: { type: "string" },
          policy: { $ref: "#/components/schemas/PolicySpec" },
          queryText: { type: "string" },
          searchExplanation: { type: "string" },
          summary: { type: "string" },
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/FeedItem" },
          },
          trace: {
            type: "object",
            properties: {
              traceId: { type: "string" },
              policyVersion: { type: "string" },
              appliedConstraints: {
                type: "array",
                items: { type: "string" },
              },
              topFactors: {
                type: "array",
                items: { type: "string" },
              },
              summary: { type: "string" },
              steps: {
                type: "array",
                items: { $ref: "#/components/schemas/ReasoningStep" },
              },
            },
            required: ["traceId", "policyVersion", "appliedConstraints", "topFactors", "summary", "steps"],
          },
        },
        required: ["traceId", "policy", "queryText", "searchExplanation", "summary", "items", "trace"],
      },
      TrackEvent: {
        type: "object",
        properties: {
          endUserId: { type: "string", minLength: 1 },
          productId: { type: "string", format: "uuid" },
          eventType: {
            type: "string",
            enum: ["view", "click", "cart_add", "purchase"],
          },
          metadata: {
            type: "object",
            additionalProperties: true,
          },
        },
        required: ["endUserId", "productId", "eventType"],
      },
      Sliders: {
        type: "object",
        properties: {
          relevance: { type: "number", minimum: 0, maximum: 1 },
          diversity: { type: "number", minimum: 0, maximum: 1 },
          novelty: { type: "number", minimum: 0, maximum: 1 },
          popularity: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
  },
  paths: {
    "/glassbox.feed": {
      post: {
        operationId: "getPersonalizedFeed",
        summary: "Get personalized feed",
        description:
          "Returns a personalized list of recommended items for the given user, ranked by the active intent profile sliders.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  userId: { type: "string", description: "End-user ID in your application" },
                  queryText: { type: "string", description: "Optional recommendation intent query" },
                  limit: { type: "integer", default: 20, minimum: 1, maximum: 100 },
                  category: { type: "string", description: "Filter by product category" },
                  sliders: { $ref: "#/components/schemas/Sliders" },
                },
                required: ["userId"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Personalized feed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RecommendationResponse" },
              },
            },
          },
          "401": { description: "Invalid or missing API key" },
          "429": { description: "Rate limit exceeded" },
        },
      },
    },
    "/glassbox.getReasoningForItem": {
      post: {
        operationId: "getReasoningForItem",
        summary: "Get reasoning chain for a specific item",
        description:
          "Returns the Glass Box reasoning chain explaining why a specific item was recommended to the user.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  userId: { type: "string" },
                  itemId: { type: "string", format: "uuid" },
                },
                required: ["userId", "itemId"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Reasoning chain",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/RecommendationResponse/properties/trace",
                },
              },
            },
          },
        },
      },
    },
    "/glassbox.getReasoningChain": {
      post: {
        operationId: "getReasoningChainByTrace",
        summary: "Get full reasoning chain by trace ID",
        description: "Returns the complete reasoning chain for a recommendation trace.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  traceId: { type: "string" },
                },
                required: ["traceId"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Full reasoning chain",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/RecommendationResponse/properties/trace",
                },
              },
            },
          },
        },
      },
    },
    "/glassbox.trackEvent": {
      post: {
        operationId: "trackEvent",
        summary: "Track a single user event",
        description:
          "Track a user interaction (view, click, cart_add, purchase) for analytics and recommendation improvement.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TrackEvent" },
            },
          },
        },
        responses: {
          "200": { description: "Event tracked" },
          "429": { description: "Rate limit exceeded" },
        },
      },
    },
    "/glassbox.trackEvents": {
      post: {
        operationId: "trackEvents",
        summary: "Track multiple events (batch)",
        description: "Track up to 100 user interaction events in a single request.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  events: {
                    type: "array",
                    items: { $ref: "#/components/schemas/TrackEvent" },
                    maxItems: 100,
                  },
                },
                required: ["events"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Events tracked",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    tracked: { type: "integer" },
                  },
                },
              },
            },
          },
          "429": { description: "Rate limit exceeded" },
        },
      },
    },
  },
};

export function GET() {
  return Response.json(spec, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
