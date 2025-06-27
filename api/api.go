package api

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"talents/db"
	"talents/pdf"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func Router() *gin.Engine {
	r := gin.Default()
	r.Use(cors.Default())

	// API endpoints
	r.POST("/talent", createTalent)
	r.GET("/talent/:id", getTalent)
	r.PUT("/talent/:id", updateTalent)
	r.DELETE("/talent/:id", deleteTalent)
	r.GET("/talents", searchTalents)
	r.POST("/talent/upload-resume", uploadResumeAndCreateTalent)
	r.Static("/resumes", "./resumes")
	r.GET("/resume/:phone", getResumeByPhone)

	// Serve static files for the frontend
	r.Static("/static", "./static")

	// Serve the main index.html
	r.GET("/", func(c *gin.Context) {
		c.File("./static/index.html")
	})

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

func uploadResumeAndCreateTalent(c *gin.Context) {
	file, header, err := c.Request.FormFile("resume")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No resume file provided"})
		return
	}
	defer file.Close()

	if filepath.Ext(header.Filename) != ".pdf" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only PDF files are supported"})
		return
	}

	timestamp := strconv.FormatInt(time.Now().Unix(), 10)
	filename := timestamp + "_" + header.Filename
	resumePath := filepath.Join("resumes", filename)

	if err := os.MkdirAll("resumes", os.ModePerm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create directory"})
		return
	}

	out, err := os.Create(resumePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save resume"})
		return
	}
	defer out.Close()

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read resume"})
		return
	}

	file.Seek(0, 0)

	_, err = io.Copy(out, file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save resume"})
		return
	}

	talent, err := pdf.GenerateTalentFromPDF(fileBytes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse resume: " + err.Error()})
		return
	}

	// Save the resume path in the talent object
	talent.ResumePath = resumePath

	// Save the talent to the database
	if err := db.CreateTalent(talent); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save talent: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Resume processed successfully",
		"talent":  talent,
		"file":    resumePath,
	})
}

func getResumeByPhone(c *gin.Context) {
	phone := c.Param("phone")
	talent, err := db.GetTalent(phone)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Talent not found"})
		return
	}

	if talent.ResumePath == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "No resume available for this talent"})
		return
	}

	c.Redirect(http.StatusFound, "/"+talent.ResumePath)
}
