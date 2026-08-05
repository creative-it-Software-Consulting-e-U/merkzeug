import type { MyNotionApi } from './index'

declare global {
  interface Window {
    mynotion: MyNotionApi
  }
}

export {}
