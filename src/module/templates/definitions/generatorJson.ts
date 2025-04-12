import {
  defineCollectorTemplate,
  type CollectorTemplate,
} from '../defineTemplate'

export default function (path: string): CollectorTemplate {
  return defineCollectorTemplate(
    {
      path,
    },
    (extractions) => {
      return JSON.stringify([...extractions.values()])
    },
    null,
  )
}
