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
	"talents/utils"

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
	r.POST("/talents/recalculate-scores", recalculateScores)
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
	file.Seek(0, 0)

	_, err = io.Copy(out, file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save resume"})
		return
	}

	// Calculate file hash
	fileHash, err := utils.CalculateFileHash(resumePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate file hash: " + err.Error()})
		return
	}

	// Check if a talent with the same resume hash already exists
	existingTalent, err := db.GetTalentByHash(fileHash)
	if err == nil {
		// Talent with same hash already exists
		c.JSON(http.StatusOK, gin.H{
			"message":         "档案已存在",
			"total":           1,
			"successful":      0,
			"duplicate_count": 1,
			"failed":          0,
			"duplicates": []gin.H{
				{
					"filename":        header.Filename,
					"existing_file":   existingTalent.ResumePath,
					"existing_talent": existingTalent,
				},
			},
		})

		// Remove the duplicate file
		os.Remove(resumePath)
		return
	}

	talent, err := pdf.GenerateTalentFromPDF(resumePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse resume: " + err.Error()})
		return
	}

	// Save the resume path and hash in the talent object
	talent.ResumePath = resumePath
	talent.Hash = fileHash

	// Save the talent to the database
	if err := db.CreateTalent(talent); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save talent: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":         "Resume processed successfully",
		"total":           1,
		"successful":      1,
		"duplicate_count": 0,
		"failed":          0,
		"results": []gin.H{
			{
				"filename": header.Filename,
				"talent":   talent,
				"file":     resumePath,
			},
		},
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
	duplicates := make([]gin.H, 0)

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

			// Calculate file hash
			fileHash, err := utils.CalculateFileHash(resumePath)
			if err != nil {
				mutex.Lock()
				errors = append(errors, gin.H{
					"filename": fileHeader.Filename,
					"error":    "Failed to calculate file hash: " + err.Error(),
				})
				mutex.Unlock()
				return
			}

			// Check if a talent with the same resume hash already exists
			existingTalent, err := db.GetTalentByHash(fileHash)
			if err == nil {
				// Talent with same hash already exists
				mutex.Lock()
				duplicates = append(duplicates, gin.H{
					"filename":        fileHeader.Filename,
					"existing_file":   existingTalent.ResumePath,
					"existing_talent": existingTalent,
				})
				mutex.Unlock()

				// Remove the duplicate file
				os.Remove(resumePath)
				return
			}

			// Generate talent from PDF
			talent, err := pdf.GenerateTalentFromPDF(resumePath)
			if err != nil {
				mutex.Lock()
				errors = append(errors, gin.H{
					"filename": fileHeader.Filename,
					"error":    "Failed to parse resume: " + err.Error(),
				})
				mutex.Unlock()
				return
			}

			// Save the resume path and hash in the talent object
			talent.ResumePath = resumePath
			talent.Hash = fileHash

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
		"message":         "Batch processing completed",
		"total":           len(files),
		"successful":      len(results),
		"duplicate_count": len(duplicates),
		"failed":          len(errors),
		"results":         results,
		"duplicates":      duplicates,
		"errors":          errors,
	})
}

// recalculateScores updates scores for all talents based on current scoring logic
func recalculateScores(c *gin.Context) {
	// Recalculate scores for all talents
	result, err := db.RecalculateAllTalentScores()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   err.Error(),
			"message": "分数重新计算失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":         "分数重新计算完成",
		"total_count":     result.TotalCount,
		"updated_count":   result.UpdatedCount,
		"no_change_count": result.NoChangeCount,
		"average_change":  result.AverageChange,
		"maximum_change":  result.MaximumChange,
		"score_changes":   result.ScoreChanges,
		"maximum_talent":  result.MaximumTalent,
	})
}
