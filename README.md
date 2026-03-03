# slow-why

**Automatically explains *why* a Node.js request is slow — during development.**

`slow-why` watches your Express requests, tracks database queries, external API calls, and event-loop blocking, then prints a short human explanation instead of raw timing data.

---

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

---

## 🧠 What It Does

During development, `slow-why`:

* Tracks each request independently
* Instruments database and network calls
* Detects common performance issues
* Prints a concise explanation

Example output:

```
┌────────────────────────────────────┐
│ Slow request detected (842ms)      │
│                                    │
│ • 71% time spent in repeated DB    │
│   queries — likely N+1 pattern     │
│                                    │
│ • External API consumed 52%        │
│   of total request time            │
│                                    │
│ • Event loop blocked for 134ms     │
└────────────────────────────────────┘
```

No dashboards. No setup complexity.

---

## ✅ MVP Scope (v0.x)

Supported:

* Express.js middleware
* `pg` (node-postgres)
* global `fetch`
* Event loop delay detection

Detects:

* N+1 database queries
* Slow external API calls
* Event loop blocking

Development use only.

---

## 📦 Installation

```bash
npm install slow-why
```

---

## 🚀 Quick Start

```ts
import express from "express"
import { slowWhy } from "slow-why"

const app = express()

app.use(slowWhy())

app.get("/", async (req, res) => {
  res.send("hello")
})

app.listen(3000)
```

Run your app normally:

```bash
npm run dev
```

Slow requests will automatically display explanations in the console.

---

## ⚙️ Configuration

```ts
slowWhy({
  threshold: 200 // ms before reporting
})
```

Options:

| Option      | Default | Description                              |
| ----------- | ------- | ---------------------------------------- |
| `threshold` | `200`   | Minimum request duration before analysis |

---

## 🔍 How It Works

For each request:

1. Creates isolated async context
2. Tracks:

   * database queries (`pg`)
   * fetch requests
   * event loop delay
3. Analyzes timing contribution
4. Generates a human-readable explanation

No application code changes required.

---

## 🧪 Example Problems Detected

### N+1 Queries

```
SELECT * FROM users WHERE id = 1
SELECT * FROM users WHERE id = 2
SELECT * FROM users WHERE id = 3
```

→ grouped and flagged automatically.

---

### Slow External API

If one HTTP request dominates execution time, it is highlighted.

---

### Event Loop Blocking

CPU-heavy synchronous work is detected using Node's event loop delay monitor.

---

## ⚠️ Development Only

`slow-why` is disabled automatically in production:

```ts
NODE_ENV=production
```

The library is designed for local debugging, not runtime monitoring.

---

## 🧩 Supported Stack (v0.x)

| Tool    | Status     |
| ------- | ---------- |
| Express | ✅          |
| pg      | ✅          |
| fetch   | ✅          |
| Fastify | 🚧 planned |
| Prisma  | 🚧 planned |

---

## 🛣 Roadmap

* Better query normalization
* Prisma support
* Fastify adapter
* Custom detectors
* IDE integration

---

## 🤝 Contributing

Issues and suggestions are welcome.

If you encounter incorrect detections, open an issue with:

* example query/code
* expected behavior
* actual output

---

## 📄 License

MIT

---

## 💡 Philosophy

Performance tools usually show **what happened**.

`slow-why` focuses on explaining **why it happened**.
