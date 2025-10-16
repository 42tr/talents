package config

import (
	"os"

	"github.com/joho/godotenv"
)

var SECRETKEY string
var HEADER string
var AUTH_URL string
var TIKA_URL string
var LLM_URL string
var LLM_KEY string
var LLM_MODEL string

func init() {
	err := godotenv.Load()
	if err != nil {
		panic("Error loading .env file")
	}
	SECRETKEY = os.Getenv("SECRETKEY")
	if SECRETKEY == "" {
		panic("SECRETKEY is not set")
	}
	HEADER = os.Getenv("HEADER")
	if HEADER == "" {
		panic("HEADER is not set")
	}
	AUTH_URL = os.Getenv("AUTH_URL")
	if AUTH_URL == "" {
		panic("AUTH_URL is not set")
	}
	TIKA_URL = os.Getenv("TIKA_URL")
	if TIKA_URL == "" {
		panic("TIKA_SERVER is not set")
	}
	LLM_URL = os.Getenv("LLM_URL")
	if LLM_URL == "" {
		panic("LLM_URL is not set")
	}
	LLM_KEY = os.Getenv("LLM_KEY")
	if LLM_KEY == "" {
		panic("LLM_KEY is not set")
	}
	LLM_MODEL = os.Getenv("LLM_MODEL")
	if LLM_MODEL == "" {
		panic("LLM_MODEL is not set")
	}
}
