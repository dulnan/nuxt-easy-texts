import type { ExtractionPlural, ExtractionText } from '../types/extraction'

export class Cache {
  public readonly singleCache: Map<string, ExtractionText> = new Map()
  public readonly pluralCache: Map<string, ExtractionPlural> = new Map()
}
