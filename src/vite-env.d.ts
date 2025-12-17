
/// <reference types="vite/client" />
import { ElectronApi } from './shared/ipc-types'

declare global {
    interface Window {
        api: ElectronApi
        electron: any // Legacy
    }
}
