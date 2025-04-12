import type { GeneratorCallback } from '../../types/generator'
import {
  defineCollectorTemplate,
  type CollectorTemplate,
} from '../defineTemplate'

export default function (
  path: string,
  cb: GeneratorCallback,
): CollectorTemplate {
  return defineCollectorTemplate(
    {
      path,
    },
    (extractions) => {
      return cb(extractions)
    },
    null,
  )
}
