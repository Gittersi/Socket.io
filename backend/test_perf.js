import http from 'http'
import { io as Client } from '../client/node_modules/socket.io-client/build/esm/index.js'

const PORT = process.env.PORT || 3000
const BASE_URL = `http://localhost:${PORT}`

console.log('⚡ Starting ChatApp Backend Performance & Stress Benchmark…\n')

async function runBenchmark() {
  // 1. Health check latency test (HTTP GET /api/health)
  console.log('📊 1. HTTP Endpoint Latency Benchmark (/api/health)')
  const httpSamples = 100
  const httpLatencies = []

  for (let i = 0; i < httpSamples; i++) {
    const start = performance.now()
    await new Promise((resolve) => {
      http.get(`${BASE_URL}/api/health`, (res) => {
        res.on('data', () => {})
        res.on('end', () => {
          httpLatencies.push(performance.now() - start)
          resolve()
        })
      })
    })
  }

  const avgHttp = (httpLatencies.reduce((a, b) => a + b, 0) / httpSamples).toFixed(2)
  const minHttp = Math.min(...httpLatencies).toFixed(2)
  const maxHttp = Math.max(...httpLatencies).toFixed(2)
  console.log(`   ✓ Total HTTP Requests: ${httpSamples}`)
  console.log(`   ✓ Avg Latency: ${avgHttp} ms | Min: ${minHttp} ms | Max: ${maxHttp} ms\n`)

  // 2. User Authentication Performance (Register + JWT Generation)
  console.log('🔑 2. User Registration & Auth Benchmark')
  const authSamples = 20
  const authLatencies = []
  const createdTokens = []

  for (let i = 0; i < authSamples; i++) {
    const username = `u_${Date.now().toString().slice(-6)}_${i}`
    const body = JSON.stringify({ username, password: 'Password123!' })
    const start = performance.now()

    await new Promise((resolve) => {
      const req = http.request(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      }, (res) => {
        let data = ''
        res.on('data', (chunk) => data += chunk)
        res.on('end', () => {
          authLatencies.push(performance.now() - start)
          try {
            const parsed = JSON.parse(data)
            if (parsed.accessToken) createdTokens.push(parsed.accessToken)
          } catch(e) {}
          resolve()
        })
      })
      req.write(body)
      req.end()
    })
  }

  const avgAuth = (authLatencies.reduce((a, b) => a + b, 0) / authSamples).toFixed(2)
  console.log(`   ✓ User Registrations: ${authSamples}`)
  console.log(`   ✓ Avg Auth & Bcrypt Hash Latency: ${avgAuth} ms per user\n`)

  if (createdTokens.length === 0) {
    console.error('❌ Could not issue tokens for socket test.')
    process.exit(1)
  }

  // 3. Socket.IO Real-Time Messaging & RTT Latency Benchmark
  console.log('🔌 3. Socket.IO Real-Time Latency & Concurrency Benchmark')
  const numSockets = Math.min(10, createdTokens.length)
  const sockets = []

  console.log(`   Connecting ${numSockets} concurrent WebSocket clients…`)
  const connStart = performance.now()

  await Promise.all(
    createdTokens.slice(0, numSockets).map((token, idx) => {
      return new Promise((resolve) => {
        const clientSocket = Client(BASE_URL, {
          auth: { token },
          transports: ['websocket'],
          reconnection: false
        })
        clientSocket.on('connect', () => {
          sockets.push(clientSocket)
          resolve()
        })
      })
    })
  )

  const connTime = (performance.now() - connStart).toFixed(2)
  console.log(`   ✓ Connected ${sockets.length} clients in ${connTime} ms`)

  // Test room join & real-time message RTT
  let testRoomId = null
  const roomCreatedPromise = new Promise((resolve) => {
    sockets[0].once('roomCreated', ({ room }) => {
      testRoomId = room.id
      resolve()
    })
  })
  sockets[0].emit('createRoom', { name: 'Performance Room' })
  await roomCreatedPromise

  sockets.forEach((s) => s.emit('joinRoom', { roomId: testRoomId }))
  await new Promise((r) => setTimeout(r, 200))

  // Broadcast Round Trip Time (RTT) benchmark
  const rttSamples = 50
  const rttLatencies = []

  for (let i = 0; i < rttSamples; i++) {
    const sendTime = performance.now()

    await new Promise((resolve) => {
      const targetSocket = sockets[1] || sockets[0]
      const handleMsg = (data) => {
        if (data.roomId === testRoomId) {
          rttLatencies.push(performance.now() - sendTime)
          targetSocket.off('chatMessage', handleMsg)
          resolve()
        }
      }
      targetSocket.on('chatMessage', handleMsg)
      sockets[0].emit('chatMessage', { roomId: testRoomId, message: `Benchmark msg #${i}` })
    })
  }

  const avgRtt = (rttLatencies.reduce((a, b) => a + b, 0) / rttSamples).toFixed(2)
  const minRtt = Math.min(...rttLatencies).toFixed(2)
  const maxRtt = Math.max(...rttLatencies).toFixed(2)

  console.log(`   ✓ Messages Broadcasted: ${rttSamples}`)
  console.log(`   ✓ Avg Real-Time Message RTT Latency: ${avgRtt} ms`)
  console.log(`   ✓ Min RTT: ${minRtt} ms | Max RTT: ${maxRtt} ms\n`)

  // Cleanup
  sockets.forEach((s) => s.disconnect())

  console.log('🏆 PERFORMANCE SUMMARY:')
  console.log(`  • HTTP Response Time:      ${avgHttp} ms`)
  console.log(`  • Bcrypt Auth Registration: ${avgAuth} ms`)
  console.log(`  • Socket Connection Time:   ${connTime} ms`)
  console.log(`  • Socket Real-time RTT:     ${avgRtt} ms`)
  console.log('\n✨ Backend performance test finished successfully!')
  process.exit(0)
}

runBenchmark().catch((err) => {
  console.error('Benchmark Error:', err)
  process.exit(1)
})
