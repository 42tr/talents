package api

import (
	"fmt"
	"net/http"

	"talents/db"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func Router() *gin.Engine {
	r := gin.Default()
	r.Use(cors.Default())

	r.POST("/talent", createTalent)
	r.GET("/talent/:id", getTalent)
	r.PUT("/talent/:id", updateTalent)
	r.DELETE("/talent/:id", deleteTalent)
	r.GET("/talents", searchTalents)

	return r
}

func createTalent(c *gin.Context) {
	var talent db.Talent
	if err := c.ShouldBindJSON(&talent); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.CreateTalent(&talent); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, talent)
}

func getTalent(c *gin.Context) {
	id := c.Param("id")
	talent, err := db.GetTalent(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, talent)
}

func updateTalent(c *gin.Context) {
	id := c.Param("id")
	var talent db.Talent
	if err := c.ShouldBindJSON(&talent); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.UpdateTalent(id, &talent); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, talent)
}

func deleteTalent(c *gin.Context) {
	id := c.Param("id")
	if err := db.DeleteTalent(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Talent deleted successfully"})
}

func searchTalents(c *gin.Context) {
	query := c.Query("query")
	talents, err := db.SearchTalents(query)
	fmt.Println(talents)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, talents)
}
