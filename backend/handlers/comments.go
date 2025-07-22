package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/nyagooh/Real-time-forum.git/backend/database"
	"github.com/nyagooh/Real-time-forum.git/backend/errLog"
	"github.com/nyagooh/Real-time-forum.git/backend/middleware"
	"github.com/nyagooh/Real-time-forum.git/backend/models"
)

func AddCommentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		errLog.Error.Println("invalid request method")
		handleError(w, fmt.Errorf("invalid request method"), http.StatusMethodNotAllowed)
		return
	}

	var commentRequest struct {
		Text string `json:"text"`
	}

	err := json.NewDecoder(r.Body).Decode(&commentRequest)
	if err != nil {
		errLog.Error.Println(err.Error())
		handleError(w, fmt.Errorf("invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	if commentRequest.Text == "" {
		errLog.Error.Println("comment content cannot be empty")
		handleError(w, fmt.Errorf("comment content cannot be empty"), http.StatusBadRequest)
		return
	}

	cleanedText := SanitizeInput(commentRequest.Text)

	userID := r.Context().Value(middleware.UserIDKey).(int)
	postIDStr := r.URL.Query().Get("id")

	postID, err := strconv.Atoi(postIDStr)
	if err != nil {
		errLog.Error.Println(err.Error())
		handleError(w, fmt.Errorf("invalid Post ID: %v", err), http.StatusBadRequest)
		return
	}

	post := &models.Post{
		Content:   cleanedText,
		CreatedAt: time.Now().Format(time.RFC3339),
	}

	err = database.AddComment(postID, userID, post)
	if err != nil {
		errLog.Error.Println(err.Error())
		handleError(w, fmt.Errorf("failed to add comment: %v", err), http.StatusInternalServerError)
		return
	}

	sendSuccessResponse(w, http.StatusOK, map[string]any{
		"success": true,
		"comment": post.Comments[0],
	})
}
