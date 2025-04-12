export type ExtractionText = {
  type: 'text'
  fullKey: string
  key: string
  context?: string
  defaultText?: string
  filePath: string
}

export type ExtractionPlural = {
  type: 'plural'
  key: string
  fullKey: string
  context?: string
  singular: string
  plural: string
  filePath: string
}

export type Extraction = ExtractionText | ExtractionPlural
