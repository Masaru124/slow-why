# slow-why

> **slow-why automatically explains why a Node.js request is slow in development.**

Stop guessing why your API endpoints are slow. slow-why gives you instant, actionable explanations for slow requests during development.

## ✨ What Problem Does This Solve?

When an endpoint is slow, developers usually see:

* logs
* timestamps  
* query counts
* profiler output

…but not the **reason**.

You still have to manually figure out:

* Is this an N+1 query problem?
* Is an external API dominating the request?
* Is CPU work blocking the event loop?

`slow-why` answers that automatically.

## 🧠 What It Does

During development, `slow-why`:

* Tracks each request independently using AsyncLocalStorage
* Instruments database and network calls
* Detects common performance issues
* Prints a concise explanation

### Example Output

```
============================================================
🐌 Slow Request Detected by slow-why
============================================================
Path: /api/users
Method: GET
Total Time: 842ms

⚠️  N+1 Query Pattern Detected
Query: select * from users where id = ?
Count: 6
Time Impact: 71.2%

💡 slow-why helps you debug performance issues in development
============================================================
```

No dashboards. No setup complexity.

## ✅ MVP Scope (v1.0)

**Supported:**

* Express.js middleware
* `pg` (node-postgres)  
* global `fetch`
* Event loop delay detection

**Detects:**

* N+1 database queries
* Slow external API calls
* Event loop blocking

**Development use only.**

## 📦 Installation

```bash
npm install slow-why
```

## 🚀 Quick Start

### Basic Setup

```js
const express = require('express')
const { slowWhy, patchPg, patchFetch } = require('slow-why')

// Patch libraries to track performance
patchPg(require('pg').Client)
patchFetch()

const app = express()
app.use(slowWhy())

app.get("/users", async (req, res) => {
  // Your slow endpoint here
  res.json({ users: [] })
})

app.listen(3000)
```

### Configuration Options

```js
app.use(slowWhy({
  threshold: 200,           // Minimum duration before analysis (ms)
  enableNPlusOne: true,     // Enable N+1 detection
  enableSlowExternal: true, // Enable slow external detection
  enableEventBlocking: true,// Enable event loop detection
  nPlusOneThreshold: 5,     // Minimum similar queries for N+1
  slowExternalThreshold: 0.4,// Min percentage for slow external
  eventBlockingThreshold: 20 // Min block time for event loop (ms)
}))
```

## 🔍 Detection Examples

### N+1 Queries

```js
// This will be detected as N+1
for (const userId of [1, 2, 3, 4, 5, 6]) {
  await client.query(`SELECT * FROM users WHERE id = ${userId}`)
}
```

**Output:**
```
⚠️  N+1 Query Pattern Detected
Query: select * from users where id = ?
Count: 6
Time Impact: 71.2%
```

### Slow External API

```js
// This will be detected as slow external
await fetch("https://slow-api.com/data") // Takes 800ms
```

**Output:**
```
🌐 Slow External API Call
URL: https://slow-api.com/data
Duration: 800ms
Time Impact: 85.3%
```

### Event Loop Blocking

```js
// This will be detected as event loop blocking
const start = Date.now()
while (Date.now() - start < 100) {} // Block for 100ms
```

**Output:**
```
🧵 Event Loop Blocking
Max Block: 104ms
Total Blocked: 104ms
Time Impact: 12.4%
```

## ⚙️ Configuration Reference

| Option | Default | Description |
|--------|---------|-------------|
| `threshold` | `500` | Minimum request duration before analysis (ms) |
| `enableNPlusOne` | `true` | Enable/disable N+1 detection |
| `enableSlowExternal` | `true` | Enable/disable slow external detection |
| `enableEventBlocking` | `true` | Enable/disable event loop detection |
| `nPlusOneThreshold` | `5` | Minimum similar queries for N+1 pattern |
| `slowExternalThreshold` | `0.4` | Min percentage of total time for external calls |
| `eventBlockingThreshold` | `20` | Minimum block time in ms for event loop |

## 🧪 Testing

### Unit Tests

```bash
npm test
```

### Manual Testing

```bash
# Start test server
npm run test:integration

# Test different scenarios
curl http://localhost:3004/test-working
```

## 🛠️ How It Works

For each request:

1. **Creates isolated async context** using AsyncLocalStorage
2. **Tracks operations:**
   * Database queries (`pg`)
   * Fetch requests  
   * Event loop delay
3. **Analyzes timing contribution** of each operation
4. **Generates human-readable explanation** if thresholds are exceeded

No application code changes required beyond middleware setup.

## 🧩 Supported Stack (v1.0)

| Tool | Status | Notes |
|------|--------|-------|
| Express | ✅ | Full support |
| pg | ✅ | Automatic query tracking |
| fetch | ✅ | Built-in and external APIs |
| Fastify | 🚧 | Planned |
| Prisma | 🚧 | Planned |
| Mongoose | 🚧 | Planned |

## ⚠️ Development Only

`slow-why` is disabled automatically in production:

```bash
NODE_ENV=production npm start
```

The library is designed for local debugging, not runtime monitoring.

## 🛣 Roadmap

* **Better query normalization** - Handle complex SQL patterns
* **Prisma support** - Automatic Prisma query tracking
* **Fastify adapter** - Support for Fastify framework
* **Custom detectors** - Plugin system for custom patterns
* **IDE integration** - VS Code extension for inline hints
* **Performance metrics** - Historical tracking and trends

## 🤝 Contributing

Issues and suggestions are welcome!

If you encounter incorrect detections, open an issue with:

* Example query/code
* Expected behavior  
* Actual output

### Development Setup

```bash
git clone https://github.com/your-username/slow-why.git
cd slow-why
npm install
npm test
```

## 📄 License

MIT

## 💡 Philosophy

Performance tools usually show **what happened**.

`slow-why` focuses on explaining **why it happened**.

---

**Made with ❤️ for developers who hate slow requests**
