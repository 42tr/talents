package university

import (
	_ "embed"
	"encoding/json"
)

type University struct {
	UnivUp     string  `json:"univUp"`
	UnivLogo   string  `json:"univLogo"`
	UnivNameCn string  `json:"univNameCn"`
	UnivNameEn string  `json:"univNameEn"`
	Score      float32 `json:"score"`
}

//go:embed university_total.json
var _str string
var _m map[string]float32

func init() {
	_m = make(map[string]float32)
	universities := []University{}
	err := json.Unmarshal([]byte(_str), &universities)
	if err != nil {
		panic(err)
	}
	for _, university := range universities {
		_m[university.UnivNameCn] = university.Score
	}
}

func CalcScore(universities []string) float32 {
	score := float32(0.1)
	for _, university := range universities {
		score = max(score, calcScore(university))
	}
	return score
}

func calcScore(name string) float32 {
	score := _m[name]
	// Convert the score from 0-1076.1 to 0-8 scale
	var convertedScore float32
	switch {
	case score == 0:
		convertedScore = 0
	case score <= 100:
		// Map linearly from 0-100 to 0-1
		convertedScore = score / 100
	case score <= 300:
		// Map linearly from 100-300 to 1-6
		convertedScore = 1 + (score-100)*5/200
	default:
		// Map linearly from 300-1076.1 to 6-8
		convertedScore = 6 + (score-300)*2/776.1
	}

	return convertedScore
}
