package main

import (
	"talents/api"
)

func main() {
	r := api.Router()
	r.Run() // listen and serve on 0.0.0.0:8080
}
