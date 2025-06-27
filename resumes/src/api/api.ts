import http from './http'
import type { Talent } from '../types/talent'

export function getTalentList(): Promise<Talent[]> {
  return http.get('/talents')
}

export function uploadResume(file: File) {
  const formData = new FormData()
  formData.append('resume', file)
  console.log(formData)
  return http.post('/talent/upload-resume', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export function getResumeUrl(phone: string | number): string {
  return `${import.meta.env.VITE_API_BASE_URL}/resume/${phone}`
}
