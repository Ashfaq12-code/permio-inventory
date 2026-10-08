declare module '*.css'
declare module '*.scss'
declare module '*.png'
declare module '*.jpg'

interface ImportMetaEnv {
  VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
