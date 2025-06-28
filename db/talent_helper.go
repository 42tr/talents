package db

var _MAJORS_RELATED = []string{"软件工程", "计算机技术"}

func format_score(score float32) float32 {
	return float32(int(score*10+0.5)) / 10
}
