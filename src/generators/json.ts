import type { Extraction } from '../types'

export default function (extractions: Extraction[]) {
  return JSON.stringify(extractions, null, 2)
}
