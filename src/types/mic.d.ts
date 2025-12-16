declare module 'mic' {
  export interface MicOptions {
    rate?: string
    channels?: string
    debug?: boolean
    exitOnSilence?: number
    device?: string
  }

  export interface MicInstance {
    getAudioStream: () => any
    start: () => void
    stop: () => void
    pause: () => void
    resume: () => void
  }

  function mic(options: MicOptions): MicInstance
  export default mic
}
