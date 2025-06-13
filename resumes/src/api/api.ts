import http from './http'
import type { Talent } from '../types/talent'

export function getTalentList(): Promise<Talent[]> {
  return http.get('/talents')
}
