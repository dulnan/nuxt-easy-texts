import type { Extraction } from '../moduleTypes'

export default function (extractions: Extraction[]) {
  return JSON.stringify(extractions, null, 2)
}
