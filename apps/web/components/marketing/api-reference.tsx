import Link from "next/link";
import "./api-reference.css";

/* Loosely-typed views of the OpenAPI document (the source spec is `as const`). */
interface SchemaNode {
  type?: string | string[];
  format?: string;
  description?: string;
  enum?: string[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  properties?: Record<string, SchemaNode>;
  required?: string[];
  items?: SchemaNode;
  maxItems?: number;
  $ref?: string;
  oneOf?: SchemaNode[];
  additionalProperties?: boolean | SchemaNode;
}

interface Operation {
  operationId?: string;
  summary?: string;
  description?: string;
  requestBody?: {
    content?: { "application/json"?: { schema?: SchemaNode } };
  };
  responses?: Record<string, { description?: string }>;
}

interface OpenApiDoc {
  info: { title: string; version: string; description?: string };
  components?: { schemas?: Record<string, SchemaNode> };
  paths: Record<string, Record<string, Operation>>;
}

const METHOD_ORDER = ["get", "post", "put", "patch", "delete"];

function resolveRef(ref: string, schemas: Record<string, SchemaNode>): SchemaNode {
  // Supports "#/components/schemas/Name" and a property path suffix
  // ("#/components/schemas/Name/properties/foo").
  const parts = ref.replace("#/components/schemas/", "").split("/");
  let node: SchemaNode | undefined = schemas[parts[0]!];
  for (let i = 1; i < parts.length && node; i += 1) {
    const key = parts[i]!;
    if (key === "properties") continue;
    node = node.properties?.[key] ?? node.items;
  }
  return node ?? {};
}

/** Build a representative example JSON value from a schema node. */
function exampleFor(
  schema: SchemaNode,
  schemas: Record<string, SchemaNode>,
  depth = 0
): unknown {
  if (depth > 6) return null;
  if (schema.$ref) return exampleFor(resolveRef(schema.$ref, schemas), schemas, depth + 1);
  if (schema.oneOf?.length) return exampleFor(schema.oneOf[0]!, schemas, depth + 1);

  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;

  if (schema.enum?.length) return schema.enum[0];
  if (schema.default !== undefined) return schema.default;

  switch (type) {
    case "object": {
      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(schema.properties ?? {})) {
        out[key] = exampleFor(value, schemas, depth + 1);
      }
      return out;
    }
    case "array":
      return schema.items ? [exampleFor(schema.items, schemas, depth + 1)] : [];
    case "integer":
      return schema.minimum ?? 1;
    case "number":
      return 0.7;
    case "boolean":
      return true;
    case "string":
      if (schema.format === "uuid") return "b1e7…";
      if (schema.format === "date-time") return "2026-01-01T00:00:00.000Z";
      return schema.description ? `<${schema.description.split(" ").slice(0, 3).join(" ")}>` : "string";
    default:
      return null;
  }
}

function PropertyRows({
  schema,
  schemas,
}: {
  schema: SchemaNode;
  schemas: Record<string, SchemaNode>;
}) {
  const resolved = schema.$ref ? resolveRef(schema.$ref, schemas) : schema;
  const required = new Set(resolved.required ?? []);
  const props = resolved.properties ?? {};
  if (Object.keys(props).length === 0) return null;

  return (
    <table className="apiref-props">
      <tbody>
        {Object.entries(props).map(([name, prop]) => {
          const type = Array.isArray(prop.type) ? prop.type.join(" | ") : prop.type;
          return (
            <tr key={name}>
              <td className="apiref-prop-name">
                {name}
                {required.has(name) && <span className="apiref-req">required</span>}
              </td>
              <td className="apiref-prop-type">
                {prop.$ref ? prop.$ref.split("/").pop() : type ?? "—"}
                {prop.enum && (
                  <span className="apiref-enum">{prop.enum.join(" · ")}</span>
                )}
              </td>
              <td className="apiref-prop-desc">{prop.description ?? ""}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function ApiReference({ spec }: { spec: unknown }) {
  const doc = spec as OpenApiDoc;
  const schemas = doc.components?.schemas ?? {};

  const operations = Object.entries(doc.paths).flatMap(([path, methods]) =>
    Object.entries(methods)
      .sort(([a], [b]) => METHOD_ORDER.indexOf(a) - METHOD_ORDER.indexOf(b))
      .map(([method, operation]) => ({ path, method, operation }))
  );

  return (
    <div className="apiref">
      <header className="apiref-hero">
        <span className="lp-eyebrow">API Reference</span>
        <h1 className="apiref-title">{doc.info.title}</h1>
        <p className="apiref-lead">
          {doc.info.description} Every recommendation comes back with a faithful{" "}
          decision trace — the same Glass Box reasoning the dashboard shows.
        </p>
        <div className="apiref-meta">
          <span className="apiref-pill">v{doc.info.version}</span>
          <span className="apiref-pill">Bearer auth · gb_live_…</span>
          <Link href="/api/docs" className="apiref-pill apiref-pill-link">
            OpenAPI JSON ↗
          </Link>
        </div>
      </header>

      <section className="apiref-auth">
        <h2 className="apiref-h2">Authentication</h2>
        <p>
          All endpoints are authenticated with an API key issued from{" "}
          <Link href="/dashboard/deploy">Dashboard → Deploy</Link>. Pass it as a
          Bearer token:
        </p>
        <pre className="apiref-code">
          <code>{`curl ${"https://glassboxengine.dev"}/api/glassbox.feed \\
  -H "Authorization: Bearer gb_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{"userId":"user-123","limit":10}'`}</code>
        </pre>
      </section>

      <nav className="apiref-toc" aria-label="Endpoints">
        {operations.map(({ path, method, operation }) => (
          <a key={`${method}-${path}`} href={`#${operation.operationId}`}>
            <span className={`apiref-method apiref-${method}`}>{method}</span>
            <span className="apiref-toc-path">/api{path}</span>
          </a>
        ))}
      </nav>

      <section className="apiref-endpoints">
        {operations.map(({ path, method, operation }) => {
          const requestSchema =
            operation.requestBody?.content?.["application/json"]?.schema;
          const example = requestSchema
            ? exampleFor(requestSchema, schemas)
            : null;
          return (
            <article
              key={`${method}-${path}`}
              id={operation.operationId}
              className="apiref-op"
            >
              <div className="apiref-op-head">
                <span className={`apiref-method apiref-${method}`}>{method}</span>
                <code className="apiref-op-path">/api{path}</code>
              </div>
              <h3 className="apiref-op-title">{operation.summary}</h3>
              {operation.description && (
                <p className="apiref-op-desc">{operation.description}</p>
              )}

              {requestSchema && (
                <div className="apiref-block">
                  <h4 className="apiref-h4">Request body</h4>
                  <PropertyRows schema={requestSchema} schemas={schemas} />
                  <pre className="apiref-code">
                    <code>{JSON.stringify(example, null, 2)}</code>
                  </pre>
                </div>
              )}

              {operation.responses && (
                <div className="apiref-block">
                  <h4 className="apiref-h4">Responses</h4>
                  <ul className="apiref-responses">
                    {Object.entries(operation.responses).map(([code, res]) => (
                      <li key={code}>
                        <span
                          className={`apiref-code-badge ${
                            code.startsWith("2") ? "ok" : "err"
                          }`}
                        >
                          {code}
                        </span>
                        {res.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <section className="apiref-schemas">
        <h2 className="apiref-h2">Schemas</h2>
        {Object.entries(schemas).map(([name, schema]) => (
          <article key={name} className="apiref-schema" id={`schema-${name}`}>
            <h3 className="apiref-op-title">{name}</h3>
            <PropertyRows schema={schema} schemas={schemas} />
          </article>
        ))}
      </section>
    </div>
  );
}
