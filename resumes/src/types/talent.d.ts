export interface Talent {
  id: number
  name: string
  email?: string
  phone?: string
  experienceScore: number // 经验分数
  educationScore: number // 教育分数
  interviewScore: number // 面试分数
  technicalScore: number // 技术分数
  culturalScore: number // 文化分数
  averageScore: number // 平均分数
  grade?: string
  created_at?: string
  updated_at?: string
}

export interface ApplicantScore {
  score: number // 分数
  grade: string // 等级
}

// 计算应聘者的平均分数
export const calculateScore = (applicant: Talent): number => {
  const { experience, education, interview, technical, cultural } = applicant.scores
  return (experience + education + interview + technical + cultural) / 5
}

// 根据分数计算等级
export const calculateGrade = (score: number): string => {
  if (score >= 9) return 'A+' // 优秀
  if (score >= 8) return 'A' // 优良
  if (score >= 7) return 'B+' // 良好
  if (score >= 6) return 'B' // 一般
  if (score >= 5) return 'C+' // 及格
  if (score >= 4) return 'C' // 勉强及格
  if (score >= 3) return 'D' // 不及格
  return 'F' // 不合格
}
