# hao-backprop-test

A simple Node.js tutorial server built with [Express.js](https://expressjs.com/).

## Endpoints

The server provides two HTTP endpoints that return plain-text responses:

| Method | Path             | Response          |
|--------|------------------|-------------------|
| GET    | `/`              | `Hello, World!\n` |
| GET    | `/good-evening`  | `Good evening`    |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher

### Install Dependencies

```bash
npm install
```

This installs [Express.js](https://www.npmjs.com/package/express) and its dependencies.

### Start the Server

```bash
npm start
```

Or run directly:

```bash
node server.js
```

The server will start on **port 3000**. You can test the endpoints with:

```bash
curl http://localhost:3000/
curl http://localhost:3000/good-evening
```
