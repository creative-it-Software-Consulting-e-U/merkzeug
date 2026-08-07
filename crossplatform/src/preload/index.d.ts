import type { MerkzeugApi } from './index'

declare global {
  interface Window {
    merkzeug: MerkzeugApi
  }
}

export {}
