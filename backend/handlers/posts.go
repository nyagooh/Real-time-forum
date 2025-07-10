package handlers

import (
	"encoding/json"
	"fmt"
	"html"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"forum/backend/database"
	"forum/backend/errLog"
	"forum/backend/middleware"

	"forum/backend/models"
	"forum/backend/utils"
)

func CreatePostHandler(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.Method == http.MethodGet:
		// Get all posts
		posts, err := database.GetAllPosts("")
		if err != nil {
			errLog.Error.Println(err.Error())
			handleError(w, fmt.Errorf("error retrieving posts: %v", err), http.StatusInternalServerError)
			return
		}

		sendSuccessResponse(w, http.StatusOK, map[string]any{
			"success": true,
			"post":    posts,
		})

	case r.Method == http.MethodPost:
		// Ensure the uploads directory exists
		if _, err := os.Stat("frontend/assets/uploads"); os.IsNotExist(err) {
			err := os.Mkdir("frontend/assets/uploads", 0755)
			if err != nil {
				log.Printf("Error creating uploads directory: %v", err)
				handleError(w, fmt.Errorf("failed to create uploads directory: %v", err), http.StatusInternalServerError)
				return
			}
		}

		post, err := parseAndValidatePostRequest(r)
		if err != nil {
			errLog.Error.Println(err.Error())
			handleError(w, err, http.StatusInternalServerError)
			return
		}

		userIDval := r.Context().Value(middleware.UserIDKey)
		if userIDval == nil {
			errLog.Error.Println("Invalid userID value")
			handleError(w, fmt.Errorf("unauthorized"), http.StatusUnauthorized)
			return
		}

		userID, ok := userIDval.(int)
		if !ok {
			errLog.Error.Println("error")
			handleError(w, fmt.Errorf("internal server error"), http.StatusInternalServerError)
			return
		}

		post.Title = SanitizeInput(post.Title)
		post.Content = SanitizeInput(post.Content)

		if post.Title == "" {
			errLog.Error.Println("Post title cannot be empty")
			handleError(w, fmt.Errorf("title cannot be empty"), http.StatusBadRequest)
			return
		}
		if post.Content == "" {
			errLog.Error.Println("Post content cannot be empty")
			handleError(w, fmt.Errorf("content cannot be empty"), http.StatusBadRequest)
			return
		}

		// Handle image upload
		file, header, err := r.FormFile("image")
		var filename string

		if err == nil && header != nil {
			defer file.Close()


			if header.Size > 10<<20 {
				log.Printf("File too large: %d bytes", header.Size)
				handleError(w, fmt.Errorf("image size must be less than 10MB. Your file is %.2f MB", float64(header.Size)/(1<<20)), http.StatusBadRequest)
				return
			}

			// Add debug logging for content type
			fileType := header.Header.Get("Content-Type")

			// Generate unique filename with original extension
			ext := filepath.Ext(header.Filename)
			if ext == "" {
				// If no extension provided, derive it from content type
				switch fileType {
				case "image/jpeg", "image/jpg":
					ext = ".jpg"
				case "image/png":
					ext = ".png"
				case "image/gif":
					ext = ".gif"
				case "image/svg+xml":
					ext = ".svg"
				default:
					log.Printf("Unsupported file type: %s", fileType)
					handleError(w, fmt.Errorf("unsupported file type. Allowed types: JPEG, PNG, GIF, SVG"), http.StatusBadRequest)
					return
				}
			}

			// Generate unique filename
			filename = fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
			filePath := filepath.Join("frontend/assets/uploads/", filename)

			// For GIF files, skip compression and just save the original
			if strings.ToLower(ext) == ".gif" || strings.ToLower(ext) == ".svg" {
				tempFile, err := os.Create(filePath)
				if err != nil {
					log.Printf("Error creating file: %v", err)
					handleError(w, fmt.Errorf("failed to create file: %v", err), http.StatusInternalServerError)
					return
				}
				defer tempFile.Close()

				_, err = io.Copy(tempFile, file)
				if err != nil {
					log.Printf("Error saving file: %v", err)
					handleError(w, fmt.Errorf("failed to save file: %v", err), http.StatusInternalServerError)
					return
				}

			} else {
				// For other image types, proceed with compression
				tempFilename := fmt.Sprintf("temp_%d%s", time.Now().UnixNano(), ext)
				tempFilePath := filepath.Join("frontend/assets/uploads/", tempFilename)
				tempFile, err := os.Create(tempFilePath)
				if err != nil {
					log.Printf("Error creating temporary file: %v", err)
					handleError(w, fmt.Errorf("failed to create temporary file: %v", err), http.StatusInternalServerError)
					return
				}
				defer tempFile.Close()

				_, err = io.Copy(tempFile, file)
				if err != nil {
					log.Printf("Error saving uploaded file: %v", err)
					handleError(w, fmt.Errorf("failed to save file: %v", err), http.StatusInternalServerError)
					return
				}

				// Compress and resize non-GIF images
				err = utils.CompressAndResizeImage(tempFilePath, filePath, 800, 600, 80)
				if err != nil {
					log.Printf("Error compressing image: %v", err)
					handleError(w, fmt.Errorf("failed to compress image: %v", err), http.StatusInternalServerError)
					return
				}

				// Delete temporary file
				os.Remove(tempFilePath)
			}

		} else if err != http.ErrMissingFile {
			log.Printf("Error retrieving file: %v", err)
			handleError(w, fmt.Errorf("failed to save file: %v", err), http.StatusInternalServerError)
			return
		}

		// Set the image URL if an image was uploaded
		if header != nil {
			post.ImageURL = "frontend/assets/uploads/" + filename
		}

		// Set the creation timestamp
		post.CreatedAt = time.Now().Format(time.RFC3339)

		postID, err := database.InsertPost(userID, post)
		if err != nil {
			errLog.Error.Println(err.Error())
			handleError(w, fmt.Errorf("failed to insert post: %v", err), http.StatusInternalServerError)
			return
		}

		sendSuccessResponse(w, http.StatusOK, map[string]any{
			"success": true,
			"title":   post.Title,
			"content": post.Content,
			"imageURL": post.ImageURL,
			"id":      postID,
		})

	default:
		errLog.Error.Println("Method not allowed")
		handleError(w, fmt.Errorf("method not allowed"), http.StatusMethodNotAllowed)
		return
	}
}

func parseAndValidatePostRequest(r *http.Request) (*models.Post, error) {
    // Parse the multipart form
    err := r.ParseMultipartForm(10 << 20) // 10 MB max file size
    if err != nil {
        return nil, fmt.Errorf("failed to parse multipart form: %v", err)
    }

    // Extract form values
    title := r.FormValue("title")
    content := r.FormValue("content")
    categoriesJSON := r.FormValue("categories")

    // Parse categories from JSON string
    var categories []string
    if categoriesJSON != "" {
        err := json.Unmarshal([]byte(categoriesJSON), &categories)
        if err != nil {
            return nil, fmt.Errorf("failed to parse categories: %v", err)
        }
    }

    // Create a new Post object
    post := &models.Post{
        Title:    title,
        Content:  content,
        Category: categories,
    }

    return post, nil
}

// SanitizeInput cleans and validates user input
func SanitizeInput(input string) string {
	input = strings.TrimSpace(input)

	// Escape HTML to prevent XSS
	input = html.EscapeString(input)

	reg := regexp.MustCompile(`[^a-zA-Z0-9\s.,!?-]`)
	input = reg.ReplaceAllString(input, "")

	return input
}
