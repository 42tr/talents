package utils

import "strings"

func StringSliceContainsAny(slice []string, substrings ...string) bool {
	for _, s := range slice {
		for _, sub := range substrings {
			if strings.Contains(s, sub) {
				return true
			}
		}
	}
	return false
}
