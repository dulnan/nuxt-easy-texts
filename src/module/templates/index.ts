import type { ModuleTemplate } from './defineTemplate'
import loader from './definitions/loader'
import keys from './definitions/keys'
import generatorDrupal from './definitions/generatorDrupal'
import generatorJson from './definitions/generatorJson'
import generatorCustom from './definitions/generatorCustom'

export const TEMPLATES: ModuleTemplate[] = [loader, keys]

export { generatorDrupal, generatorJson, generatorCustom }
