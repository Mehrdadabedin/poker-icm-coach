# ICM Master MCP server

Development diagnostic layer for the ICM Master application. Read-only, stdio
only, not deployed.

```
Prime Agent (or any MCP client)
        |  MCP over stdio
        v
  icm-master-mcp  (this directory)
        |            read-only GETs + static source inspection
        v
  ICM Master application: FastAPI backend (backend/), React frontend (frontend/)
```

The stack is FastAPI plus SQLAlchemy/PostgreSQL, not Django: the backend has no
`urls.py` and no Django settings module, so the diagnostics inspect the FastAPI
routers and `app/core/config.py` where the real configuration lives.

## Layout

```
mcp/
  server.py            MCPServer("icm-master-mcp", 0.1.0), stdio entry point
  config.py            paths, probe allowlist, secret names
  redaction.py         last-line scrub of every result before it is returned
  planned_tools.py     FUTURE tool catalogue (documentation only)
  diagnostics/         one module per diagnostic, all read-only
  tools/               MCP tool wrappers (thin, scrubbed)
  tests/               unit tests, no network and no real credentials
```

## Tools

| Tool | Reads | Notes |
| --- | --- | --- |
| `check_backend_health` | `GET /api/health`, `GET /api/auth/providers` | reachability, latency, provider flags |
| `check_oauth_routes` | router source, `GET /api/openapi.json` | authorize and callback route presence |
| `check_google_oauth_environment` | process env, `backend/.env` | presence by NAME only |
| `check_google_callback_configuration` | router source, env, `frontend/.env.production` | expected redirect URI plus its source |
| `check_cors_configuration` | env, `backend/.env`, `app/core/config.py`, `app/main.py` | origins, credential flag |
| `check_cookie_configuration` | backend and frontend sources | cookie attributes, or the token transport used instead |
| `diagnose_google_oauth` | all of the above | one report with `overall_status` |
| `list_planned_tools` | `planned_tools.py` | FUTURE ICM, tournament, coach, database tools |

`overall_status` is `healthy` (routes present, credentials present, backend
advertises `google: true`), `configuration_error` (a route or a credential is
missing, or the running backend reports `google: false`), or `diagnostic` (the
backend did not answer, so its live state is unknown).

## Security

- No write tool, no shell tool, no generic file reader. Tools are narrow.
- Credential variables are reported as `present` or `missing`, never by value.
  `GOOGLE_CLIENT_SECRET` cannot appear in a result.
- Every result passes through `redaction.redact_tree` before it is returned,
  which also strips `code=`/`access_token=`/`client_secret=` parameters and
  `GOCSPX-`, `ya29.` and JWT shapes.
- Only `http`/`https` GETs to `/api/health`, `/api/auth/providers` and
  `/api/openapi.json`, and only to hosts in the probe allowlist: loopback,
  any `*.onrender.com`, plus `ICM_MCP_ALLOWED_HOSTS` if an operator adds one.
- No credentials, cookies or headers are sent, and redirects are not followed.
- stdio transport only: the server opens no port and has no public endpoint.

## Run

```bash
cd mcp
uv sync                       # isolated environment, see pyproject.toml
uv run python server.py       # stdio server for an MCP client
uv run mcp dev server.py      # MCP Inspector in a browser
uv run pytest                 # 61 tests
```

Point the probes at another backend with `ICM_MCP_BACKEND_URL` (must be an
allowed host) or with the `base_url` argument of a tool.

## Dependencies

`mcp[cli]>=2.2` (MCP Python SDK v2, `FastMCP` is `MCPServer` there), `httpx`,
and `pytest`/`pytest-asyncio` for development. `[tool.uv] package = false`
keeps this a plain environment: nothing here is installed into the backend
dependency set in `../backend/pyproject.toml`, and no backend file imports it.
