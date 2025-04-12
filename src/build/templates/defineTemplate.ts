import type { ModuleHelper } from '../classes/ModuleHelper'
import type { Extraction } from '../types/extraction'

type TemplateOptions = {
  path: string
  virtual?: boolean
}

type CollectorTemplateCallback = (
  extractions: Extraction[],
  helper: ModuleHelper,
) => string | Promise<string>

type StaticTemplateCallback = (helper: ModuleHelper) => string

export type CollectorTemplate = {
  type: 'collector'
  options: TemplateOptions
  build: CollectorTemplateCallback | null
  buildTypes: CollectorTemplateCallback | null
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
): CollectorTemplate {
  return {
    type: 'collector',
    options,
    build,
    buildTypes,
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
