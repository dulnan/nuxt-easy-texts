import { extname } from 'pathe'
import type { Nuxt, WatchEvent } from 'nuxt/schema'
import type { Collector } from './Collector'
import type { ModuleHelper } from './ModuleHelper'
import type { ViteDevServer, WebSocketServer } from 'vite'

const POSSIBLE_EXTENSIONS = ['.js', '.ts', '.vue', '.mjs']

export class DevModeHandler {
  private viteWebSocket: WebSocketServer | null = null

  constructor(
    private nuxt: Nuxt,
    private collector: Collector,
    private helper: ModuleHelper,
  ) {}

  public init() {
    this.nuxt.hooks.hookOnce(
      'vite:serverCreated',
      this.onViteServerCreated.bind(this),
    )
    this.nuxt.hook('builder:watch', this.onBuilderWatch.bind(this))

    // Nuxt will tell us once the templates have been updated.
    this.nuxt.hook('app:templatesGenerated', (_app, templates) => {
      const isAffected = templates.some((v) =>
        v.dst.includes('nuxt-easy-texts/keys'),
      )
      if (isAffected) {
        this.sendHmrMessage()
      }
    })
  }

  async onBuilderWatch(event: WatchEvent, providedFilePath: string) {
    this.helper.logDebug('onBuilderWatch: ' + event)

    const fileExtension = extname(providedFilePath).toLowerCase()
    if (!POSSIBLE_EXTENSIONS.includes(fileExtension)) {
      return
    }

    // Hack: This is supposed to be absolute. But it's not. Sometimes.
    // Let's make sure it's really absolute. We have to assume that the path
    // is actually relative to the source directory. If not, HMR will be
    // broken.
    const pathAbsolute = providedFilePath.startsWith('/')
      ? providedFilePath
      : this.helper.resolvers.src.resolve(providedFilePath)

    const { hasChanged, error } = await this.collector.handleWatchEvent(
      event,
      pathAbsolute,
    )

    if (error) {
      this.sendError(error)
      return
    }
  }

  private onViteServerCreated(server: ViteDevServer) {
    this.viteWebSocket = server.ws
  }

  private sendError(error: { message: string }) {
    if (!this.viteWebSocket) {
      return
    }
    this.viteWebSocket.send({
      type: 'error',
      err: {
        message: error.message,
        stack: '',
      },
    })
  }

  private sendHmrMessage() {
    if (!this.viteWebSocket) {
      return
    }
    this.helper.logDebug('Sending HMR message')
    this.viteWebSocket.send({
      type: 'custom',
      event: 'nuxt-easy-texts:reload',
    })
  }
}
