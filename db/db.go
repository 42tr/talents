package db

import (
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var db *gorm.DB

func init() {
	var err error
	db, err = gorm.Open(sqlite.Open("talents.db"), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}
	db.AutoMigrate(&Talent{})
	CreateTalent(&Talent{
		Name:            "John Doe",
		Email:           "john.doe@example.com",
		Phone:           12345678901,
		ExperienceScore: 8,
		EducationScore:  9,
		TechnicalScore:  10,
		InterviewScore:  9,
		CulturalScore:   8,
		AverageScore:    9,
	})
}
