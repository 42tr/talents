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
}

func (this *Talent) CalcScore() {
	calExperienceScore := func(companies StringSlice) float32 {
		lv1s := []string{"阿里", "腾讯", "百度", "字节跳动"}
		if utils.StringSliceContainsAny(lv1s, companies...) {
			return 9
		}
		lv2s := []string{"华为", "中兴", "小米", "oppo", "vivo", "realme"}
		if utils.StringSliceContainsAny(lv2s, companies...) {
			return 7.5
		}
		return 6
	}
	this.ExperienceScore = calExperienceScore(this.Companies)

	calEducationScore := func(universities []string, education string, major string) float32 {
		score := university.CalcScore(universities)
		if utils.StringSliceContainsAny(_MAJORS_RELATED, education) {
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
				return 0.1
			}

			if utils.StringSliceContainsAny(skills, "大模型微调") {
				score += 0.7
			} else if utils.StringSliceContainsAny(skills, "大模型") {
				score += 0.8
			}
			if utils.StringSliceContainsAny(skills, "rust") {
				score += 0.5
			}
			for _, skill := range []string{"java", "go", "c", "c++", "javascript", "js", "react", "angular", "vue", "node", "database", "sql", "nosql", "docker", "kubernetes", "k8s", "mysql", "redis", "postgresql", "mongodb", "elasticsearch", "es", "prometheus"} {
				if utils.StringSliceContainsAny(skills, skill) {
					score += 0.1
				}
			}
		case "算法":
			if !utils.StringSliceContainsAny(skills, "python") {
				return 0.1
			}
			return 10
		case "前端":
			if !utils.StringSliceContainsAny(skills, "vue3") {
				return 0.1
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
				return 0.1
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
			if utils.StringSliceContainsAny(skills, "c", "java", "python", "go", "rust") {
				score += 1
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
		}

		if blog != "" {
			score += 0.5
		}
		if github != "" {
			score += 0.5
		}

		return min(format_score(score), 10)
	}
	this.TechnicalScore = calTechnicalScore(this.Skills, this.Blog, this.Github)

	calIntentScore := func(expectCities []string) float32 {
		if len(expectCities) == 0 {
			return 8
		}
		if utils.StringSliceContainsAny(expectCities, "南京") {
			return 10
		}
		return 5
	}
	this.IntentScore = calIntentScore(this.Universities)

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
	this.AverageScore = calcAvgScore(this.ExperienceScore, this.EducationScore, this.TechnicalScore, this.IntentScore)
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
