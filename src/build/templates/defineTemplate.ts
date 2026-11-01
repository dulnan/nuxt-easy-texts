import type { ModuleHelper } from '../classes/ModuleHelper'
import type { Extraction, ExtractionError } from '../types/extraction'

type TemplateOptions = {
  path: string
  virtual?: boolean
}

type CollectorTemplateCallback = (
  extractions: Extraction[],
  helper: ModuleHelper,
) => string | Promise<string>

/**
 * Returns the extractions the template can't generate output for. They are
 * reported like any other extraction error.
 */
type CollectorTemplateValidator = (
  extractions: Extraction[],
) => ExtractionError[]

type StaticTemplateCallback = (helper: ModuleHelper) => string

export type CollectorTemplate = {
  type: 'collector'
  options: TemplateOptions
  build: CollectorTemplateCallback | null
  buildTypes: CollectorTemplateCallback | null
  validate?: CollectorTemplateValidator
}

export type StaticTemplate = {
  type: 'static'
  options: TemplateOptions
  build: StaticTemplateCallback | null
  buildTypes: StaticTemplateCallback | null
}

export type ModuleTemplate = CollectorTemplate | StaticTemplate

export function defineCollectorTemplate(
  options: TemplateOptions,
  build: CollectorTemplateCallback | null,
  buildTypes: CollectorTemplateCallback | null,
  validate?: CollectorTemplateValidator,
): CollectorTemplate {
  return {
    type: 'collector',
    options,
    build,
    buildTypes,
    validate,
  }
}

export function defineStaticTemplate(
  options: TemplateOptions,
  build: StaticTemplateCallback | null,
  buildTypes: StaticTemplateCallback | null,
): StaticTemplate {
  return {
    type: 'static',
    options,
    build,
    buildTypes,
  }
}
