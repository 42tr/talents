package api

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"sync"
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
	r.POST("/talent/upload-resumes", uploadMultipleResumesAndCreateTalents)
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
	sort.Slice(talents, func(i, j int) bool {
		return talents[i].AverageScore > talents[j].AverageScore
	})

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

func uploadMultipleResumesAndCreateTalents(c *gin.Context) {
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form"})
		return
	}

	files := form.File["resumes[]"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No resume files provided"})
		return
	}

	// Use a mutex to protect concurrent access to results and errors slices
	var mutex sync.Mutex
	results := make([]gin.H, 0, len(files))
	errors := make([]gin.H, 0)

	if err := os.MkdirAll("resumes", os.ModePerm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create directory"})
		return
	}

	// Use a wait group to wait for all goroutines to complete
	var wg sync.WaitGroup

	// Process files concurrently
	for _, fileHeader := range files {
		wg.Add(1)
		// Start a goroutine for each file
		go func(fileHeader *multipart.FileHeader) {
			defer wg.Done()

			// Skip non-PDF files
			if filepath.Ext(fileHeader.Filename) != ".pdf" {
				mutex.Lock()
				errors = append(errors, gin.H{
					"filename": fileHeader.Filename,
					"error":    "Only PDF files are supported",
				})
				mutex.Unlock()
				return
			}

			// Open the file
			file, err := fileHeader.Open()
			if err != nil {
				mutex.Lock()
				errors = append(errors, gin.H{
					"filename": fileHeader.Filename,
					"error":    "Failed to open file",
				})
				mutex.Unlock()
				return
			}
			defer file.Close()

			// Create a unique filename with timestamp
			timestamp := strconv.FormatInt(time.Now().Unix(), 10)
			filename := timestamp + "_" + fileHeader.Filename
			resumePath := filepath.Join("resumes", filename)

			// Create the output file
			out, err := os.Create(resumePath)
			if err != nil {
				mutex.Lock()
				errors = append(errors, gin.H{
					"filename": fileHeader.Filename,
					"error":    "Failed to save resume",
				})
				mutex.Unlock()
				return
			}
			defer out.Close()

			// Read file bytes for PDF processing
			fileBytes, err := io.ReadAll(file)
			if err != nil {
				mutex.Lock()
				errors = append(errors, gin.H{
					"filename": fileHeader.Filename,
					"error":    "Failed to read resume",
				})
				mutex.Unlock()
				return
			}

			// Reset file position for copying
			file.Seek(0, 0)

			// Copy file to output
			_, err = io.Copy(out, file)
			if err != nil {
				mutex.Lock()
				errors = append(errors, gin.H{
					"filename": fileHeader.Filename,
					"error":    "Failed to save resume",
				})
				mutex.Unlock()
				return
			}

			// Generate talent from PDF
			talent, err := pdf.GenerateTalentFromPDF(fileBytes)
			if err != nil {
				mutex.Lock()
				errors = append(errors, gin.H{
					"filename": fileHeader.Filename,
					"error":    "Failed to parse resume: " + err.Error(),
				})
				mutex.Unlock()
				return
			}

			// Save the resume path in the talent object
			talent.ResumePath = resumePath

			// Save the talent to the database
			if err := db.CreateTalent(talent); err != nil {
				mutex.Lock()
				errors = append(errors, gin.H{
					"filename": fileHeader.Filename,
					"error":    "Failed to save talent: " + err.Error(),
				})
				mutex.Unlock()
				return
			}

			// Add success result
			mutex.Lock()
			results = append(results, gin.H{
				"filename": fileHeader.Filename,
				"talent":   talent,
				"file":     resumePath,
			})
			mutex.Unlock()
		}(fileHeader)
	}

	// Wait for all goroutines to complete
	wg.Wait()

	c.JSON(http.StatusOK, gin.H{
		"message":    "Batch processing completed",
		"total":      len(files),
		"successful": len(results),
		"failed":     len(errors),
		"results":    results,
		"errors":     errors,
	})
}
