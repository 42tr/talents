package main

import (
	"log"
	"talents/api"

	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}
	r := api.Router()
	r.Run() // listen and serve on 0.0.0.0:8080
}
