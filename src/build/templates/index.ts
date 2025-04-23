import type { ModuleTemplate } from './defineTemplate'
import loader from './definitions/loader'
import keys from './definitions/keys'
import global from './definitions/global'
import generatorDrupal from './definitions/generatorDrupal'
import generatorJson from './definitions/generatorJson'
import generatorCustom from './definitions/generatorCustom'

export const TEMPLATES: ModuleTemplate[] = [loader, keys, global]

export { generatorDrupal, generatorJson, generatorCustom }
