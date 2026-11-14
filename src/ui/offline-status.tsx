import { useEffect, useState } from 'react'
import { CloudOff, Wifi } from 'lucide-react'

export function OfflineStatus() {
  const [online, setOnline] = useState(true)
  const [offlineReady, setOfflineReady] = useState(false)

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine)
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => setOfflineReady(true)).catch(() => setOfflineReady(false))
    }
    return () => {
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
    }
  }, [])

  return <span className={`offline-status${online ? '' : ' is-offline'}`} aria-live="polite">{online ? <Wifi aria-hidden="true" /> : <CloudOff aria-hidden="true" />}{online ? offlineReady ? 'OFFLINE READY' : 'OFFLINE SETUP' : 'OFFLINE'}</span>
}
