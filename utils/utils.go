package utils

import (
	"crypto/sha256"
	"encoding/hex"
	"io"
	"os"
	"strings"
)

func StringSliceContainsAny(slice []string, substrings ...string) bool {
	for _, s := range slice {
		for _, sub := range substrings {
			if strings.Contains(sub, s) {
				return true
			}
		}
	}
	return false
}

// CalculateFileHash computes SHA-256 hash for a file
func CalculateFileHash(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", err
	}

	return hex.EncodeToString(hash.Sum(nil)), nil
}
