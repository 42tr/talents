package db

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"talents/university"
	"talents/utils"
)

// StringSlice is a custom type for handling string slice in GORM
type StringSlice []string

// Scan implements the sql.Scanner interface
func (ss *StringSlice) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("failed to unmarshal StringSlice value")
	}

	return json.Unmarshal(bytes, ss)
}

// Value implements the driver.Valuer interface
func (ss StringSlice) Value() (driver.Value, error) {
	if ss == nil {
		return nil, nil
	}
	return json.Marshal(ss)
}

type Talent struct {
	Phone           uint64      `gorm:"primaryKey" json:"phone"`
	Name            string      `json:"name"`
	Age             int8        `json:"age"`
	Email           string      `json:"email"`
	Education       string      `json:"education"`
	Major           string      `json:"major"`
	Skills          StringSlice `gorm:"type:text" json:"skills"`
	Years           int         `json:"years"`
	Blog            string      `json:"blog"`
	Github          string      `json:"github"`
	Native          string      `json:"native"`
	Universities    StringSlice `gorm:"type:text" json:"universities"`
	Companies       StringSlice `gorm:"type:text" json:"companies"`
	JobPosition     string      `json:"jobPosition"` // 应聘岗位
	ExpectCities    StringSlice `gorm:"type:text" json:"expectCities"`
	ExpectSalary    int         `json:"expectSalary"`
	ExperienceScore float32     `json:"experienceScore"` // 经验分
	EducationScore  float32     `json:"educationScore"`  // 学历分
	TechnicalScore  float32     `json:"technicalScore"`  // 技术分
	IntentScore     float32     `json:"intentScore"`     // 意向分
	AverageScore    float32     `json:"averageScore"`
	ResumePath      string      `json:"resumePath"` // 简历文件路径
	Hash            string      `json:"hash"`
	InterviewRecord string      `json:"interviewRecord"` // 面试记录
}

func (this *Talent) CalcScore() {
	calExperienceScore := func(companies StringSlice) float32 {
		score := float32(5)
		lv2s := []string{"华为", "中兴", "小米", "oppo", "vivo", "realme", "思杰", "二十八", "十四", "京东", "哔哩哔哩"}
		if utils.StringSliceContainsAny(lv2s, companies...) {
			score = 5.5
		}
		lv1s := []string{"阿里", "腾讯", "百度", "字节跳动", "甲骨文"}
		if utils.StringSliceContainsAny(lv1s, companies...) {
			score = 7
		}
		lv0s := []string{"谷歌"}
		if utils.StringSliceContainsAny(lv0s, companies...) {
			score = 8
		}
		if this.Years >= 2 {
			score += 0.5
		}
		if this.Years >= 5 {
			score += 0.5
		}
		if this.Years >= 7 {
			score += 0.5
		}
		if this.Years >= 10 {
			score += 0.5
		}
		return score
	}
	this.ExperienceScore = calExperienceScore(this.Companies)

	calEducationScore := func(universities []string, education string, major string) float32 {
		score := university.CalcScore(universities)
		if utils.StringSliceContainsAny([]string{"软件", "计算机", "物联网", "人工智能", "大数据", "云计算", "嵌入式", "电子信息"}, major) {
			score += 1
		}
		if education == "硕士" {
			score += 1
		}
		if education == "博士" {
			score += 2
		}
		return format_score(min(score, 10))
	}
	this.EducationScore = calEducationScore(this.Universities, this.Education, this.Major)

	calTechnicalScore := func(skills []string, blog string, github string) float32 {
		score := float32(5.0)
		switch this.JobPosition {
		case "后端":
			if !utils.StringSliceContainsAny(skills, "python") {
				score -= 2
			}
			if !utils.StringSliceContainsAny(skills, "大模型", "ollama", "vllm", "transformer", "pytorch", "numpy", "langchain") {
				score -= 2
			}

			if utils.StringSliceContainsAny(skills, "大模型微调") {
				score += 0.5
			}
			if utils.StringSliceContainsAny(skills, "rust") {
				score += 0.5
			}
			if utils.StringSliceContainsAny(skills, "kubernetes", "k8s") {
				score += 0.5
			}
			if utils.StringSliceContainsAny(skills, "docker") {
				score += 0.5
			}
			if utils.StringSliceContainsAny(skills, "es", "elasticsearch", "elk") {
				score += 0.5
			}
			if utils.StringSliceContainsAny(skills, "transformer", "numpy", "pytorch") {
				score += 0.5
			}
			if utils.StringSliceContainsAny(skills, "javascript", "js", "angular", "vue", "react", "nodejs") {
				score += 0.2
			}
			if utils.StringSliceContainsAny(skills, "mysql", "postgresql", "sql", "tidb") {
				score += 0.2
			}
			if utils.StringSliceContainsAny(skills, "设计模式") {
				score += 0.2
			}

			for _, skill := range []string{"java", "go", "c", "c++", "nosql", "redis", "mongodb", "prometheus", "ollama", "vllm", "fastapi", "kafka", "rabbitmq", "zookeeper", "rocketmq", "pulsar", "minio", "etcd", "langchain"} {
				if utils.StringSliceContainsAny(skills, skill) {
					score += 0.1
				}
			}
		case "算法":
			if !utils.StringSliceContainsAny(skills, "python") {
				return 0.1
			}
			score := float32(5.0)
			if utils.StringSliceContainsAny(skills, "transformer") {
				score += 0.5
			}
			if utils.StringSliceContainsAny(skills, "pytorch") {
				score += 0.5
			}
			if utils.StringSliceContainsAny(skills, "微调") {
				score += 0.5
			}
		case "前端":
			if utils.StringSliceContainsAny(skills, "vue3") {
				score += 1
			}
			if utils.StringSliceContainsAny(skills, "react") {
				score += 0.5
			}
			if utils.StringSliceContainsAny(skills, "angular") {
				score += 0.5
			}
			if utils.StringSliceContainsAny(skills, "vite") {
				score += 1
			}
			if utils.StringSliceContainsAny(skills, "git") {
				score += 1
			}
			if utils.StringSliceContainsAny(skills, "typescript", "ts") {
				score += 1
			}
		case "运维":
			if !utils.StringSliceContainsAny(skills, "docker") {
				score -= 2
			}
			if utils.StringSliceContainsAny(skills, "大模型") {
				score += 1
			}
			if utils.StringSliceContainsAny(skills, "kubernetes", "k8s") {
				score += 1
			}
			if utils.StringSliceContainsAny(skills, "shell") {
				score += 1
			}
			if utils.StringSliceContainsAny(skills, "arm64") {
				score += 1
			}
			if utils.StringSliceContainsAny(skills, "mysql", "redis", "postgresql", "mongodb", "elasticsearch", "es", "prometheus") {
				score += 1
			}
			if utils.StringSliceContainsAny(skills, "python") {
				score += 1
			}
			if utils.StringSliceContainsAny(skills, "c", "java", "python", "go", "rust") {
				score += 0.5
			}
		case "嵌入式":
			if utils.StringSliceContainsAny(skills, "c", "c++") {
				score += 1
			}
			if utils.StringSliceContainsAny(skills, "arm", "stm32", "esp32", "esp8266", "bsp") {
				score += 1
			}
			if utils.StringSliceContainsAny(skills, "ai") {
				score += 1
			}
			if utils.StringSliceContainsAny(skills, "transformer", "embedding") {
				score += 1
			}
			if utils.StringSliceContainsAny(skills, "昇腾", "寒武纪") {
				score += 1
			}
			if utils.StringSliceContainsAny(skills, "量化") {
				score += 1
			}
			if utils.StringSliceContainsAny(skills, "移植") {
				score += 1
			}
		}

		if blog != "" {
			score += 1
		}
		if github != "" {
			score += 0.5
		}

		return min(format_score(score), 10)
	}
	this.TechnicalScore = calTechnicalScore(this.Skills, this.Blog, this.Github)

	// calIntentScore := func(expectCities []string) float32 {
	// 	if len(expectCities) == 0 {
	// 		return 8
	// 	}
	// 	if utils.StringSliceContainsAny(expectCities, "南京") {
	// 		return 10
	// 	}
	// 	return 5
	// }
	// this.IntentScore = calIntentScore(this.Universities)

	// calculateAverageScore calculates average of non-zero scores
	calcAvgScore := func(scores ...float32) float32 {
		total := float32(0)
		count := 0

		for _, score := range scores {
			total += score
			count++
		}

		if count == 0 {
			return 0
		}

		// 计算平均值并保留一位小数
		return format_score(total / float32(count))
	}
	this.AverageScore = calcAvgScore(this.ExperienceScore, this.EducationScore, this.TechnicalScore)
}

func CreateTalent(t *Talent) error {
	return db.Create(t).Error
}

func GetTalent(id string) (*Talent, error) {
	var talent Talent
	if err := db.First(&talent, id).Error; err != nil {
		return nil, err
	}
	return &talent, nil
}

func UpdateTalent(id string, t *Talent) error {
	return db.Model(&Talent{}).Where("phone = ?", id).Updates(t).Error
}

// UpdateTalentInterviewRecord updates only the interview_record field using direct SQL
func UpdateTalentInterviewRecord(id string, interviewRecord string) error {
	return db.Exec("UPDATE talents SET interview_record = ? WHERE phone = ?", interviewRecord, id).Error
}

func DeleteTalent(id string) error {
	return db.Delete(&Talent{}, "phone = ?", id).Error
}

func ListTalents() ([]*Talent, error) {
	var talents []*Talent
	if err := db.Find(&talents).Error; err != nil {
		return nil, err
	}
	return talents, nil
}

// ScoreChange represents the score changes for a talent
type ScoreChange struct {
	Talent       *Talent `json:"talent"`
	OldAvgScore  float32 `json:"old_avg_score"`
	NewAvgScore  float32 `json:"new_avg_score"`
	ScoreDiff    float32 `json:"score_diff"`
	OldExpScore  float32 `json:"old_exp_score"`
	NewExpScore  float32 `json:"new_exp_score"`
	OldEduScore  float32 `json:"old_edu_score"`
	NewEduScore  float32 `json:"new_edu_score"`
	OldTechScore float32 `json:"old_tech_score"`
	NewTechScore float32 `json:"new_tech_score"`
}

// RecalculationResult contains the results of a recalculation operation
type RecalculationResult struct {
	TotalCount    int           `json:"total_count"`
	UpdatedCount  int           `json:"updated_count"`
	NoChangeCount int           `json:"no_change_count"`
	ScoreChanges  []ScoreChange `json:"score_changes"`
	AverageChange float32       `json:"average_change"`
	MaximumChange float32       `json:"maximum_change"`
	MaximumTalent *Talent       `json:"maximum_talent"`
}

func abs(num float32) float32 {
	if num < 0 {
		return -num
	}
	return num
}

// RecalculateAllTalentScores recalculates scores for all talents in the database
func RecalculateAllTalentScores() (*RecalculationResult, error) {
	// Get all talents
	talents, err := ListTalents()
	if err != nil {
		return nil, err
	}

	// Initialize result
	result := &RecalculationResult{
		TotalCount:   len(talents),
		ScoreChanges: make([]ScoreChange, 0),
	}

	// Track the maximum change
	var maxChange float32 = 0
	var maxTalent *Talent = nil

	// Recalculate scores for each talent
	for _, talent := range talents {
		// Store original scores
		originalAvgScore := talent.AverageScore
		originalExpScore := talent.ExperienceScore
		originalEduScore := talent.EducationScore
		originalTechScore := talent.TechnicalScore

		// Recalculate scores
		talent.CalcScore()

		// Calculate absolute difference
		scoreDiff := talent.AverageScore - originalAvgScore
		absDiff := scoreDiff
		if absDiff < 0 {
			absDiff = -absDiff
		}

		// Only update if score changed
		if absDiff > 0.001 { // Use a small epsilon for float comparison
			// Update the database
			if err := db.Save(talent).Error; err != nil {
				return nil, err
			}

			// Create a score change record
			scoreChange := ScoreChange{
				Talent:       talent,
				OldAvgScore:  originalAvgScore,
				NewAvgScore:  talent.AverageScore,
				ScoreDiff:    scoreDiff,
				OldExpScore:  originalExpScore,
				NewExpScore:  talent.ExperienceScore,
				OldEduScore:  originalEduScore,
				NewEduScore:  talent.EducationScore,
				OldTechScore: originalTechScore,
				NewTechScore: talent.TechnicalScore,
			}

			// Add to result
			result.ScoreChanges = append(result.ScoreChanges, scoreChange)
			result.UpdatedCount++

			// Update average change
			result.AverageChange += absDiff

			// Track maximum change
			if abs(scoreDiff) > abs(maxChange) {
				maxChange = scoreDiff
				maxTalent = talent
			}
		} else {
			result.NoChangeCount++
		}
	}

	// Calculate final average
	if result.UpdatedCount > 0 {
		result.AverageChange = result.AverageChange / float32(result.UpdatedCount)
		result.MaximumChange = maxChange
		result.MaximumTalent = maxTalent
	}

	return result, nil
}

func SearchTalents(query string) ([]*Talent, error) {
	var talents []*Talent
	qry := db
	if query != "" {
		qry = qry.Where("name LIKE ? OR email LIKE ?", "%"+query+"%", "%"+query+"%")
	}
	if err := qry.Find(&talents).Error; err != nil {
		return nil, err
	}
	return talents, nil
}

// GetTalentByHash checks if a talent with the given resume hash already exists
func GetTalentByHash(hash string) (*Talent, error) {
	var talent Talent
	err := db.Where("hash = ?", hash).First(&talent).Error
	if err != nil {
		return nil, err
	}
	return &talent, nil
}
