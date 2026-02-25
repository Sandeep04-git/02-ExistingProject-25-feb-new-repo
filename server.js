'use strict';

const express = require('express');
const { randomUUID } = require('crypto');
const os = require('os');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Centralised server configuration.
 * All tuneable values live here so they are easy to locate and change.
 */
const config = Object.freeze({
  /** Port the HTTP server listens on. */
  port: Number(process.env.PORT) || 3000,

  /** Human-readable name used in log output and the health endpoint. */
  serviceName: 'hello_world',

  /** Current application version (mirrors package.json). */
  version: '1.0.0',

  /** Node.js environment label. */
  env: process.env.NODE_ENV || 'development',

  /** Timeout in milliseconds for the graceful-shutdown drain period. */
  shutdownTimeout: 10_000,
});

// ---------------------------------------------------------------------------
// Logger utility
// ---------------------------------------------------------------------------

/**
 * Lightweight structured logger.
 * Each log line is a single JSON object so it is easy to parse with any
 * log-aggregation tool (ELK, Datadog, CloudWatch, etc.).
 *
 * @param {'info' | 'warn' | 'error' | 'debug'} level - severity level
 * @param {string}  message - human-readable description
 * @param {Record<string, unknown>} [meta] - optional structured metadata
 */
function log(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: config.serviceName,
    message,
    ...meta,
  };
  const output = JSON.stringify(entry);

  if (level === 'error') {
    process.stderr.write(output + '\n');
  } else {
    process.stdout.write(output + '\n');
  }
}

// ---------------------------------------------------------------------------
// Express application
// ---------------------------------------------------------------------------

const app = express();

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------

/**
 * Request-ID middleware.
 * Attaches a unique identifier to every incoming request so that all log
 * lines produced while handling that request can be correlated.  If the
 * caller already supplies an `X-Request-Id` header it is re-used;
 * otherwise a new UUIDv4 is generated.
 */
app.use((req, _res, next) => {
  req.id = req.headers['x-request-id'] || randomUUID();
  next();
});

/**
 * Security-headers middleware.
 * Sets a small but meaningful set of HTTP response headers that improve
 * the default security posture of the service.
 */
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

/**
 * Request-logging middleware.
 * Logs the method, path and response status of every request together with
 * the elapsed time in milliseconds.  The log line is written when the
 * response finishes so that the status code is available.
 */
app.use((req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationNs = Number(process.hrtime.bigint() - start);
    const durationMs = (durationNs / 1e6).toFixed(2);

    log('info', 'request completed', {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs,
    });
  });

  next();
});

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/**
 * GET /
 * Returns the original "Hello, World!" greeting.
 * This preserves backward compatibility with the initial HTTP server.
 */
app.get('/', (_req, res) => {
  res.type('text/plain').send('Hello, World!\n');
});

/**
 * GET /good-evening
 * Returns a "Good evening" greeting.
 */
app.get('/good-evening', (_req, res) => {
  res.type('text/plain').send('Good evening');
});

/**
 * GET /health
 * Lightweight health-check endpoint suitable for load-balancer probes and
 * container orchestrators.  Returns a JSON payload describing current
 * service health together with uptime and memory usage.
 */
app.get('/health', (_req, res) => {
  const memoryUsage = process.memoryUsage();

  res.json({
    status: 'ok',
    service: config.serviceName,
    version: config.version,
    uptime: Math.floor(process.uptime()),
    environment: config.env,
    memory: {
      rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(1)} MB`,
      heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(1)} MB`,
      heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(1)} MB`,
    },
  });
});

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------

/**
 * Catch-all handler for routes that do not match any of the definitions
 * above.  Returns a structured JSON error so that API consumers receive
 * a machine-readable response rather than Express's default HTML page.
 */
app.use((req, res, _next) => {
  res.status(404).json({
    error: 'Not Found',
    message: `The requested resource ${req.method} ${req.originalUrl} does not exist.`,
    statusCode: 404,
  });
});

// ---------------------------------------------------------------------------
// Centralised error handler
// ---------------------------------------------------------------------------

/**
 * Express error-handling middleware (four parameters).
 * Captures any error thrown or forwarded via `next(err)` in upstream
 * middleware / route handlers and returns a consistent JSON error payload.
 */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const statusCode = err.statusCode || err.status || 500;

  log('error', 'unhandled error', {
    requestId: req.id,
    error: err.message,
    stack: config.env !== 'production' ? err.stack : undefined,
  });

  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal Server Error' : err.message,
    message:
      config.env !== 'production'
        ? err.message
        : 'An unexpected error occurred.',
    statusCode,
  });
});

// ---------------------------------------------------------------------------
// Server startup
// ---------------------------------------------------------------------------

const server = app.listen(config.port, () => {
  log('info', 'server started', {
    port: config.port,
    environment: config.env,
    nodeVersion: process.version,
    platform: `${os.type()} ${os.release()}`,
    pid: process.pid,
  });

  log('info', 'available routes', {
    routes: [
      'GET  /             → Hello, World!',
      'GET  /good-evening → Good evening',
      'GET  /health       → service health check',
    ],
  });
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

/**
 * Handles SIGINT / SIGTERM signals by closing the HTTP server and allowing
 * in-flight requests to drain before the process exits.  A hard timeout
 * ensures the process does not hang indefinitely.
 *
 * @param {string} signal - the OS signal that triggered shutdown
 */
function gracefulShutdown(signal) {
  log('info', `${signal} received — starting graceful shutdown`);

  // Stop accepting new connections.
  server.close(() => {
    log('info', 'all connections drained — exiting');
    process.exit(0);
  });

  // If connections do not drain in time, force exit.
  setTimeout(() => {
    log('warn', 'shutdown timeout exceeded — forcing exit');
    process.exit(1);
  }, config.shutdownTimeout).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ---------------------------------------------------------------------------
// Uncaught-exception safety net
// ---------------------------------------------------------------------------

process.on('uncaughtException', (err) => {
  log('error', 'uncaught exception — shutting down', {
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log('error', 'unhandled promise rejection — shutting down', {
    reason: String(reason),
  });
  process.exit(1);
});

// ---------------------------------------------------------------------------
// Module export (useful for testing or programmatic usage)
// ---------------------------------------------------------------------------

module.exports = { app, server, config };
