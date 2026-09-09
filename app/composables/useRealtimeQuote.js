// 即時報價（瀏覽器端）。
//
// 目前傳輸層為「輪詢 /api/stocks/:symbol/quote」。
// 未來 Spring Boot 提供 WebSocket / SSE 後，新增一個實作相同介面的傳輸層
// （start(onData) / stop()），把下方 createPollingTransport 換掉即可，
// 這個 composable 與使用它的元件都不需修改。

function createPollingTransport({ client, symbol, intervalMs }) {
  let timer = null
  let running = false

  async function tick(onData, onError) {
    const sym = unref(symbol)
    if (!sym) return
    try {
      const data = await client(`/stocks/${sym}/quote`)
      onData(data)
    } catch (err) {
      onError(err)
    }
  }

  return {
    start(onData, onError) {
      running = true
      tick(onData, onError)
      const loop = () => {
        if (!running) return
        timer = setTimeout(async () => {
          if (typeof document === 'undefined' || document.visibilityState === 'visible') {
            await tick(onData, onError)
          }
          loop()
        }, intervalMs)
      }
      loop()
    },
    stop() {
      running = false
      if (timer) clearTimeout(timer)
      timer = null
    }
  }
}

export const QUOTE_STATUS_LABELS = {
  idle: '尚未連線',
  connecting: '更新中…',
  live: '已更新',
  stalled: '連線不穩，顯示最後報價',
  error: '無法取得報價'
}

export function useRealtimeQuote(symbol, options = {}) {
  const { intervalMs = 5000 } = options
  const { client } = useApi()

  const quote = ref(null)
  // idle | connecting | live | stalled | error
  const status = ref('idle')
  const updatedAt = ref(null)

  let transport = null

  function handleData(data) {
    quote.value = data
    updatedAt.value = new Date()
    status.value = 'live'
  }

  function handleError() {
    status.value = quote.value ? 'stalled' : 'error'
  }

  function connect() {
    disconnect()
    status.value = 'connecting'
    transport = createPollingTransport({ client, symbol, intervalMs })
    transport.start(handleData, handleError)
  }

  function disconnect() {
    if (transport) transport.stop()
    transport = null
  }

  onMounted(connect)
  onBeforeUnmount(disconnect)

  watch(
    () => unref(symbol),
    () => {
      quote.value = null
      connect()
    }
  )

  return { quote, status, updatedAt, refresh: connect, disconnect }
}
