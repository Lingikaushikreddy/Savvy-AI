
import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

export const useAppListeners = () => {
    const { setStatus, setAudioLevel, connectionStatus, setConnectionStatus } = useAppStore()

    useEffect(() => {
        // We need to poll for audio level if we are listening, or setup a listener if the bridge supports it.
        // The legacy bridge supported 'audio-get-level' polling. 
        // Ideally, we move this to an event-based approach, but polling is fine for now.

        // Status Listeners
        // Check if legacy electronAPI exposes these listeners
        const electron = window.electron // Using legacy exposure for listeners as defined in preload
        if (!electron) return

        const unsubSolutionStart = electron.onSolutionStart(() => setStatus('processing'))
        const unsubSolutionSuccess = electron.onSolutionSuccess(() => setStatus('ready'))
        const unsubSolutionError = electron.onSolutionError(() => setStatus('error'))
        const unsubDebugStart = electron.onDebugStart(() => setStatus('processing'))

        // Polling for audio level (temporary until event stream)
        const audioPoll = setInterval(async () => {
            if (useAppStore.getState().status === 'listening') {
                try {
                    const level = await electron.getAudioLevel()
                    // Normalize level (assuming it comes as 0-1 or generic volume, let's map to 0-100)
                    setAudioLevel(Math.min(100, level * 100))
                } catch (e) {
                    // ignore
                }
            }
        }, 100)

        // Check connection status
        const checkOnline = () => setConnectionStatus(navigator.onLine ? 'online' : 'offline')
        window.addEventListener('online', checkOnline)
        window.addEventListener('offline', checkOnline)

        return () => {
            unsubSolutionStart()
            unsubSolutionSuccess()
            unsubSolutionError()
            unsubDebugStart()
            clearInterval(audioPoll)
            window.removeEventListener('online', checkOnline)
            window.removeEventListener('offline', checkOnline)
        }
    }, [setStatus, setAudioLevel, setConnectionStatus])
}
