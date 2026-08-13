// Host-half service typings: the minimal structural shape of every harness
// service this plugin consumes, plus the Context augmentation that makes
// `ctx.webServer` / `ctx.settings` / ... typecheck. All four are hard
// dependencies declared in `inject` by the entry module.

export interface HttpRequest {
  method?: string
  url?: string
}

export interface HttpResponse {
  statusCode: number
  setHeader(name: string, value: string): void
  end(body: string): void
}

export interface WebServerService {
  register(route: {
    kind: 'exact'
    path: string
    handler(req: HttpRequest, res: HttpResponse): void | Promise<void>
  }): () => void
}

export interface SettingsService {
  get(ns: string): unknown
}

export interface CredentialsService {
  resolve(ref: string): Promise<{ value?: unknown } | null | undefined>
}

export interface LlmService {
  listProviders(): Array<{ id?: unknown }>
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    webServer: WebServerService
    settings: SettingsService
    credentials: CredentialsService
    llm: LlmService
  }
}
