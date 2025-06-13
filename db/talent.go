package db

type Talent struct {
	Phone           uint64  `gorm:"primaryKey" json:"phone"`
	Name            string  `json:"name"`
	Email           string  `json:"email"`
	ExperienceScore float32 `json:"experienceScore"`
	EducationScore  float32 `json:"educationScore"`
	TechnicalScore  float32 `json:"technicalScore"`
	InterviewScore  float32 `json:"interviewScore"`
	CulturalScore   float32 `json:"culturalScore"`
	AverageScore    float32 `json:"averageScore"`
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
