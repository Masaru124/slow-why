const { AsyncLocalStorage } = require('async_hooks')

// Simple types for JS version
const storage = new AsyncLocalStorage()

// Configuration
const DEFAULT_CONFIG = {
  threshold: 500,
  enableNPlusOne: true,
  enableSlowExternal: true,
  enableEventBlocking: true,
  nPlusOneThreshold: 5,
  slowExternalThreshold: 0.4,
  eventBlockingThreshold: 20
}

function createContext(path, method) {
  return {
    path,
    method,
    startTime: Date.now(),
    dbCalls: [],
    httpCalls: [],
    eventLoopBlocks: []
  }
}

function getContext() {
  return storage.getStore()
}

function runWithContext(context, fn) {
  return storage.run(context, fn)
}

function normalizeQuery(query) {
  if (!query || typeof query !== "string") {
    return ""
  }

  return query
    .replace(/\b\d+\b/g, "?")
    .replace(/'[^']*'/g, "?")
    .replace(/"[^"]*"/g, "?")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function detectNPlusOne(dbCalls, threshold = 5) {
  if (!dbCalls || dbCalls.length < threshold) {
    return null
  }

  const normalizedQueries = new Map()

  for (const call of dbCalls) {
    if (!call || !call.query) continue
    
    const normalized = normalizeQuery(call.query)
    
    if (!normalizedQueries.has(normalized)) {
      normalizedQueries.set(normalized, { count: 0, totalTime: 0, queries: [] })
    }
    
    const group = normalizedQueries.get(normalized)
    group.count++
    group.totalTime += (call.duration || 0)
    group.queries.push(call)
  }

  for (const [query, group] of normalizedQueries.entries()) {
    if (group.count >= threshold) {
      const totalDbTime = dbCalls.reduce((sum, call) => sum + (call.duration || 0), 0)
      return {
        query,
        count: group.count,
        totalTime: group.totalTime,
        percentage: totalDbTime > 0 ? (group.totalTime / totalDbTime) * 100 : 0
      }
    }
  }

  return null
}

function detectSlowExternal(httpCalls, totalTime, threshold = 0.4) {
  if (!httpCalls || httpCalls.length === 0 || !totalTime) {
    return null
  }

  for (const call of httpCalls) {
    if (!call || !call.duration) continue
    
    const percentage = (call.duration / totalTime) * 100
    if (percentage > threshold * 100) {
      return {
        url: call.url || 'unknown',
        duration: call.duration,
        percentage
      }
    }
  }

  const slowestCall = httpCalls.reduce((slowest, call) => 
    (call && call.duration && (!slowest || call.duration > slowest.duration)) ? call : slowest
  , null)

  if (slowestCall && slowestCall.duration) {
    const percentage = (slowestCall.duration / totalTime) * 100
    if (percentage > 20) {
      return {
        url: slowestCall.url || 'unknown',
        duration: slowestCall.duration,
        percentage
      }
    }
  }

  return null
}

function detectEventBlocking(eventLoopBlocks, totalTime, threshold = 20) {
  if (!eventLoopBlocks || eventLoopBlocks.length === 0 || !totalTime) {
    return null
  }

  const significantBlocks = eventLoopBlocks.filter(block => block && block.delay >= threshold)
  
  if (significantBlocks.length === 0) {
    return null
  }

  const maxBlock = Math.max(...significantBlocks.map(block => block.delay))
  const totalBlockedTime = significantBlocks.reduce((sum, block) => sum + block.delay, 0)
  const percentage = (totalBlockedTime / totalTime) * 100

  return {
    maxBlock,
    totalBlockedTime,
    percentage
  }
}

function report(result, config) {
  // Always use plain text for reliability
  console.log('\n' + '='.repeat(60))
  console.log('🐌 Slow Request Detected by slow-why')
  console.log('='.repeat(60))
  console.log(`Path: ${result.path}`)
  console.log(`Method: ${result.method}`)
  console.log(`Total Time: ${result.totalTime.toFixed(0)}ms`)
  console.log('')

  if (result.nPlusOne) {
    console.log('⚠️  N+1 Query Pattern Detected')
    console.log(`Query: ${result.nPlusOne.query}`)
    console.log(`Count: ${result.nPlusOne.count}`)
    console.log(`Time Impact: ${result.nPlusOne.percentage.toFixed(1)}%`)
    console.log('')
  }

  if (result.slowExternal) {
    console.log('🌐 Slow External API Call')
    console.log(`URL: ${result.slowExternal.url}`)
    console.log(`Duration: ${result.slowExternal.duration.toFixed(0)}ms`)
    console.log(`Time Impact: ${result.slowExternal.percentage.toFixed(1)}%`)
    console.log('')
  }

  if (result.eventBlocking) {
    console.log('🧵 Event Loop Blocking')
    console.log(`Max Block: ${result.eventBlocking.maxBlock.toFixed(0)}ms`)
    console.log(`Total Blocked: ${result.eventBlocking.totalBlockedTime.toFixed(0)}ms`)
    console.log(`Time Impact: ${result.eventBlocking.percentage.toFixed(1)}%`)
    console.log('')
  }

  if (!result.nPlusOne && !result.slowExternal && !result.eventBlocking) {
    console.log('No specific performance issues detected.')
    console.log('Request was slow but within normal patterns.')
    console.log('')
  }

  console.log('💡 slow-why helps you debug performance issues in development')
  console.log('='.repeat(60) + '\n')
}

function analyzeRequest(context, totalTime, config = {}) {
  try {
    const finalConfig = { ...DEFAULT_CONFIG, ...config }
    const result = {
      path: context.path || 'unknown',
      method: context.method || 'unknown',
      totalTime: totalTime || 0
    }

    // Run detectors based on configuration
    if (finalConfig.enableNPlusOne) {
      const nPlusOneResult = detectNPlusOne(context.dbCalls, finalConfig.nPlusOneThreshold)
      if (nPlusOneResult) result.nPlusOne = nPlusOneResult
    }

    if (finalConfig.enableSlowExternal) {
      const slowExternalResult = detectSlowExternal(context.httpCalls, totalTime, finalConfig.slowExternalThreshold)
      if (slowExternalResult) result.slowExternal = slowExternalResult
    }

    if (finalConfig.enableEventBlocking) {
      const eventBlockingResult = detectEventBlocking(context.eventLoopBlocks, totalTime, finalConfig.eventBlockingThreshold)
      if (eventBlockingResult) result.eventBlocking = eventBlockingResult
    }

    report(result, finalConfig)
  } catch (error) {
    console.error('slow-why: Error analyzing request:', error.message)
  }
}

function patchPg(Client) {
  try {
    if (!Client || !Client.prototype || !Client.prototype.query) {
      console.warn('slow-why: Could not patch pg - invalid Client provided')
      return
    }

    const originalQuery = Client.prototype.query

    Client.prototype.query = async function (...args) {
      const ctx = getContext()
      const start = Date.now()

      try {
        const result = await originalQuery.apply(this, args)
        
        const duration = Date.now() - start

        if (ctx) {
          const query = typeof args[0] === "string" ? args[0] : args[0]?.text || ""
          
          const dbCall = {
            query,
            duration,
            timestamp: start
          }
          
          ctx.dbCalls.push(dbCall)
        }

        return result
      } catch (error) {
        const duration = Date.now() - start
        
        if (ctx) {
          const query = typeof args[0] === "string" ? args[0] : args[0]?.text || ""
          
          const dbCall = {
            query,
            duration,
            timestamp: start
          }
          
          ctx.dbCalls.push(dbCall)
        }

        throw error
      }
    }
  } catch (error) {
    console.warn('slow-why: Failed to patch pg:', error.message)
  }
}

function patchFetch() {
  try {
    if (typeof global.fetch !== "function") {
      console.warn('slow-why: fetch not available, skipping patch')
      return
    }

    const originalFetch = global.fetch

    global.fetch = async function (input, init) {
      const ctx = getContext()
      const start = Date.now()

      try {
        const response = await originalFetch.call(this, input, init)
        
        const duration = Date.now() - start

        if (ctx) {
          const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url || ""
          
          const httpCall = {
            url,
            duration,
            status: response.status,
            timestamp: start
          }
          
          ctx.httpCalls.push(httpCall)
        }

        return response
      } catch (error) {
        const duration = Date.now() - start
        
        if (ctx) {
          const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url || ""
          
          const httpCall = {
            url,
            duration,
            status: 0,
            timestamp: start
          }
          
          ctx.httpCalls.push(httpCall)
        }

        throw error
      }
    }
  } catch (error) {
    console.warn('slow-why: Failed to patch fetch:', error.message)
  }
}

function slowWhy(options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options }

  return function (req, res, next) {
    // Skip in production
    if (process.env.NODE_ENV === "production") {
      return next()
    }

    try {
      const context = createContext(req.path, req.method)

      runWithContext(context, () => {
        const originalEnd = res.end

        res.end = function (...args) {
          const result = originalEnd.apply(this, args)
          
          setImmediate(() => {
            try {
              const totalTime = Date.now() - context.startTime
              
              if (totalTime > config.threshold) {
                analyzeRequest(context, totalTime, config)
              }
            } catch (error) {
              console.error('slow-why: Error in request analysis:', error.message)
            }
          })

          return result
        }

        next()
      })
    } catch (error) {
      console.error('slow-why: Error in middleware setup:', error.message)
      next()
    }
  }
}

module.exports = {
  slowWhy,
  patchPg,
  patchFetch,
  analyzeRequest,
  createContext,
  getContext,
  runWithContext
}
