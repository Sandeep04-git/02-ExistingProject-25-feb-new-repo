# hao-backprop-test

A production-ready Node.js tutorial server built with [Express.js](https://expressjs.com/).

## Features

- **Structured JSON logging** — every request and lifecycle event is logged as
  a single-line JSON object, ready for any log-aggregation pipeline.
- **Request-ID correlation** — each request receives a unique UUID (or re-uses
  the caller-supplied `X-Request-Id` header) so logs can be correlated
  end-to-end.
- **Security headers** — responses include `X-Content-Type-Options`,
  `X-Frame-Options`, and `Cache-Control` headers by default.
- **Health-check endpoint** — `GET /health` returns uptime, memory usage, and
  version metadata for load-balancer probes and container orchestrators.
- **Centralised error handling** — unmatched routes return a structured JSON
  404; thrown errors are caught by a global error-handling middleware.
- **Graceful shutdown** — the server drains in-flight connections on `SIGTERM`
  / `SIGINT` before exiting, with a configurable hard-stop timeout.
- **Uncaught-exception safety net** — unexpected errors and unhandled promise
  rejections are logged before the process exits.

## Endpoints

| Method | Path             | Response                          |
|--------|------------------|-----------------------------------|
| GET    | `/`              | `Hello, World!\n` (plain text)    |
| GET    | `/good-evening`  | `Good evening` (plain text)       |
| GET    | `/health`        | JSON service health payload       |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher

### Install Dependencies

```bash
npm install
```

This installs [Express.js](https://www.npmjs.com/package/express) and its
transitive dependencies.

### Start the Server

```bash
npm start
```

Or run directly:

```bash
node server.js
```

The server listens on **port 3000** by default (override with the `PORT`
environment variable).

### Test the Endpoints

```bash
curl http://localhost:3000/
curl http://localhost:3000/good-evening
curl http://localhost:3000/health
```

## Configuration

All tuneable values are defined in the `config` object at the top of
`server.js`:

| Variable            | Default       | Description                                |
|---------------------|---------------|--------------------------------------------|
| `PORT`              | `3000`        | Port the HTTP server listens on            |
| `NODE_ENV`          | `development` | Environment label (affects error verbosity)|

## License

MIT
