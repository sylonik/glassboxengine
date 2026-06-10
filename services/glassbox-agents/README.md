# glassbox-agents

Simple ReAct agent
Agent generated with `agents-cli` version `0.1.3`

## Project Structure

```
glassbox-agents/
├── app/         # Core agent code
│   ├── agent.py               # Main agent logic
│   ├── agent_runtime_app.py    # Agent Runtime application logic
│   └── app_utils/             # App utilities and helpers
├── tests/                     # Unit, integration, and load tests
├── GEMINI.md                  # AI-assisted development guide
└── pyproject.toml             # Project dependencies
```

> 💡 **Tip:** Use [Gemini CLI](https://github.com/google-gemini/gemini-cli) for AI-assisted development - project context is pre-configured in `GEMINI.md`.

## Requirements

Before you begin, ensure you have:
- **uv**: Python package manager (used for all dependency management in this project) - [Install](https://docs.astral.sh/uv/getting-started/installation/) ([add packages](https://docs.astral.sh/uv/concepts/dependencies/) with `uv add <package>`)
- **agents-cli**: Agents CLI - Install with `uv tool install google-agents-cli`
- **Google Cloud SDK**: For GCP services - [Install](https://cloud.google.com/sdk/docs/install)


## Quick Start

Install required packages:

```bash
agents-cli install
```

Test the agent with a local web server:

```bash
agents-cli playground
```

You can also use features from the [ADK](https://adk.dev/) CLI with `uv run adk`.

## Commands

| Command              | Description                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------- |
| `agents-cli install` | Install dependencies using uv                                                         |
| `agents-cli playground` | Launch local development environment                                                  |
| `agents-cli lint`    | Run code quality checks                                                               |
| `uv run pytest tests/unit tests/integration` | Run unit and integration tests                                                        |
| `agents-cli deploy`  | Deploy agent to Agent Runtime                                                                |
| `agents-cli publish gemini-enterprise` | Register deployed agent to Gemini Enterprise                    |

## 🛠️ Project Management

| Command | What It Does |
|---------|--------------|
| `agents-cli scaffold enhance` | Add CI/CD pipelines and Terraform infrastructure |
| `agents-cli infra cicd` | One-command setup of entire CI/CD pipeline + infrastructure |
| `agents-cli scaffold upgrade` | Auto-upgrade to latest version while preserving customizations |

---

## Development

Edit your agent logic in `app/agent.py` and test with `agents-cli playground` - it auto-reloads on save.

## Deployment

```bash
gcloud config set project <your-project-id>
agents-cli deploy
```

To add CI/CD and Terraform, run `agents-cli scaffold enhance`.
To set up your production infrastructure, run `agents-cli infra cicd`.

## Observability

Built-in telemetry exports to Cloud Trace, BigQuery, and Cloud Logging.

## Environment Variables

### Required (GCP / Vertex AI)

| Variable | Description |
|----------|-------------|
| `GLASSBOX_AGENT_MODEL` | Gemini model ID (default: `gemini-2.5-flash`) |
| `GOOGLE_CLOUD_LOCATION` | Vertex AI region (default: `us-east1`) |
| `LOGS_BUCKET_NAME` | GCS bucket for artifact storage (optional; falls back to in-memory) |

### Glassbox Platform MCP Integration (optional — graceful degradation)

These two vars connect the agents to the live Glassbox MCP server
(`GLASSBOX_MCP_URL` e.g. `https://glassboxengine.dev/api/mcp`).
When either var is unset the MCP toolset is silently skipped, so local
development and the ADK playground work without a live MCP connection.

| Variable | Description |
|----------|-------------|
| `GLASSBOX_MCP_URL` | Base URL of the Streamable-HTTP MCP server |
| `GLASSBOX_MCP_API_KEY` | Bearer token sent as `Authorization: Bearer <key>` |

To deploy with MCP enabled, add both vars as secrets in Secret Manager and
reference them in the Cloud Run / Agent Engine service configuration.
