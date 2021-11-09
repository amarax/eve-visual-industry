/// <reference types="vite/client" />

interface ImportMetaEnv extends Readonly<Record<string, string>> {
    readonly VITE_EVE_APP_CLIENT_ID: string
    readonly VITE_EVE_APP_SECRET_KEY: string
    
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }