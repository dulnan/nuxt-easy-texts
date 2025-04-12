export type ExtractionText = {
  type: 'text'
  fullKey: string
  key: string
  context?: string
  defaultText?: string
  filePath: string
  call?: MethodCall
}

export type ExtractionPlural = {
  type: 'plural'
  key: string
  fullKey: string
  context?: string
  singular: string
  plural: string
  filePath: string
  call?: MethodCall
}

export type MethodCall = {
  code: string
  start: number
  end: number
}

export type ExtractionError = {
  call?: MethodCall
  message: string
  filePath: string
}

export type Extraction = ExtractionText | ExtractionPlural
