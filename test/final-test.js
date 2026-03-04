const express = require('express')
const { slowWhy, patchPg, patchFetch } = require('../src/index.js')

// Create a proper mock pg Client class
class MockClient {
  async query(sql) {
    console.log('Mock DB query:', sql)
    await new Promise(resolve => setTimeout(resolve, 200)) // 200ms per query
    return { rows: [] }
  }
}

// Patch the MockClient class
patchPg(MockClient)

// Patch fetch
patchFetch()

const app = express()

// Use middleware with low threshold for testing
app.use(slowWhy({ threshold: 100 })) // 100ms threshold

app.get('/test-working', async (req, res) => {
  // This WILL trigger slow-why
  const client = new MockClient()
  for (let i = 1; i <= 3; i++) {
    await client.query(`SELECT * FROM users WHERE id = ${i}`)
  }
  
  // Add artificial delay to guarantee trigger
  await new Promise(resolve => setTimeout(resolve, 300))
  
  res.json({ message: 'Working version test - should trigger slow-why!' })
})

const PORT = 3004
app.listen(PORT, () => {
  console.log(`🚀 WORKING VERSION test server on http://localhost:${PORT}`)
  console.log('📞 This WILL trigger slow-why output:')
  console.log(`   curl http://localhost:${PORT}/test-working`)
  console.log('')
  console.log('💡 Total time will be ~900ms (3 queries × 200ms + 300ms delay)')
  console.log('💡 Threshold is 100ms, so this should definitely trigger!')
  console.log('💡 Using plain text output (no chalk/boxen dependencies)')
})
