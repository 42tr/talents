package db

func format_score(score float32) float32 {
	return float32(int(score*10+0.5)) / 10
}
