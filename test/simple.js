// Simple test for slow-why
console.log('🧪 Testing slow-why...\n')

// Test 1: Basic import
try {
  const { analyzeRequest } = require('../dist/index.js')
  console.log('✅ Import successful')
} catch (err) {
  console.log('❌ Import failed:', err.message)
  process.exit(1)
}

// Test 2: N+1 Detection
console.log('\n📊 Testing N+1 Detection...')
const { analyzeRequest } = require('../dist/index.js')

const context = {
  path: '/test-n-plus-one',
  method: 'GET',
  startTime: Date.now(),
  dbCalls: [
    { query: 'SELECT * FROM users WHERE id = 1', duration: 50, timestamp: Date.now() },
    { query: 'SELECT * FROM users WHERE id = 2', duration: 45, timestamp: Date.now() },
    { query: 'SELECT * FROM users WHERE id = 3', duration: 55, timestamp: Date.now() },
    { query: 'SELECT * FROM users WHERE id = 4', duration: 48, timestamp: Date.now() },
    { query: 'SELECT * FROM users WHERE id = 5', duration: 52, timestamp: Date.now() },
    { query: 'SELECT * FROM users WHERE id = 6', duration: 51, timestamp: Date.now() }
  ],
  httpCalls: [],
  eventLoopBlocks: []
}

console.log(`Simulating request with ${context.dbCalls.length} queries...`)
analyzeRequest(context, 300)

// Test 3: Slow External Detection
console.log('\n🌐 Testing Slow External Detection...')
const context2 = {
  path: '/test-external',
  method: 'GET',
  startTime: Date.now(),
  dbCalls: [],
  httpCalls: [
    { url: 'https://api.example.com/slow', duration: 800, status: 200, timestamp: Date.now() }
  ],
  eventLoopBlocks: []
}

console.log('Simulating request with slow external call...')
analyzeRequest(context2, 1000)

// Test 4: Event Loop Blocking
console.log('\n🧵 Testing Event Loop Blocking...')
const context3 = {
  path: '/test-blocking',
  method: 'GET', 
  startTime: Date.now(),
  dbCalls: [],
  httpCalls: [],
  eventLoopBlocks: [
    { delay: 25, timestamp: Date.now() },
    { delay: 30, timestamp: Date.now() }
  ]
}

console.log('Simulating request with event loop blocking...')
analyzeRequest(context3, 200)

console.log('\n✅ All tests completed!')
console.log('\n💡 If you see colored boxed outputs above, slow-why is working correctly!')
