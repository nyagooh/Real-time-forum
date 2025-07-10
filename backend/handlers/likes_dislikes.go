package handlers

import (
	"fmt"
	"net/http"
	"strconv"

	"forum/backend/database"
	"forum/backend/errLog"
	"forum/backend/middleware"
)

// LikePostHandler handles liking a post.
func LikePostHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)
	postIDStr := r.URL.Query().Get("id")

	postID, err := strconv.Atoi(postIDStr)
	if err != nil {
		errLog.Error.Println(err.Error())
		handleError(w, fmt.Errorf("invalid Post ID: %v", err), http.StatusBadRequest)
		return
	}

	err = database.ToggleReaction(userID, postID, "like")
	if err != nil {
		errLog.Error.Println(err.Error())
		handleError(w, fmt.Errorf("failed to like post: %v", err), http.StatusInternalServerError)
		return
	}

	likes, dislikes, _ := database.GetReactionCounts(postID)

	sendSuccessResponse(w, http.StatusOK, map[string]any{
		"success":  true,
		"likes":    likes,
		"dislikes": dislikes,
	})
}

// DislikePostHandler handles disliking a post.
func DislikePostHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)
	postIDStr := r.URL.Query().Get("id")

	postID, err := strconv.Atoi(postIDStr)
	if err != nil {
		errLog.Error.Println(err.Error())
		handleError(w, fmt.Errorf("invalid Post ID: %v", err), http.StatusBadRequest)
		return
	}

	err = database.ToggleReaction(userID, postID, "dislike")
	if err != nil {
		errLog.Error.Println(err.Error())
		handleError(w, fmt.Errorf("failed to dislike post: %v", err), http.StatusInternalServerError)
		return
	}

	likes, dislikes, _ := database.GetReactionCounts(postID)

	sendSuccessResponse(w, http.StatusOK, map[string]any{
		"success":  true,
		"likes":    likes,
		"dislikes": dislikes,
	})
}
