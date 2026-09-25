interface ImportMetaEnv {
  /** Where the API is. Defaults to a local api-vista. */
  readonly VITE_API_BASE_URL?: string
  /** The counter app. Defaults to https://pos.vistahub.my. */
  readonly VITE_POS_URL?: string
  /** The owner dashboard. Defaults to https://rms.vistahub.my. */
  readonly VITE_RMS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
