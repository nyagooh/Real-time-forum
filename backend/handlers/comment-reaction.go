package handlers

import (
	"fmt"
	"net/http"
	"strconv"

	"forum/backend/database"
	"forum/backend/errLog"
	"forum/backend/middleware"
)

// LikeCommentHandler handles liking a comment
func LikeCommentHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)
	commentIDStr := r.URL.Query().Get("commentId")

	commentID, err := strconv.Atoi(commentIDStr)
	if err != nil {
		errLog.Error.Println(err.Error())
		handleError(w, fmt.Errorf("invalid Comment ID: %v", err), http.StatusBadRequest)
		return
	}

	err = database.ToggleCommentReaction(userID, commentID, "like")
	if err != nil {
		errLog.Error.Println(err.Error())
		handleError(w, fmt.Errorf("failed to like comment: %v", err), http.StatusInternalServerError)
		return
	}

	// Return updated reaction counts
	likes, dislikes, _ := database.GetCommentReactionCounts(commentID)
	
	sendSuccessResponse(w, http.StatusOK, map[string]any{
		"success":  true,
		"likes":    likes,
		"dislikes": dislikes,
	})
}

// DislikeCommentHandler handles disliking a comment
func DislikeCommentHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)
	commentIDStr := r.URL.Query().Get("commentId")

	commentID, err := strconv.Atoi(commentIDStr)
	if err != nil {
		errLog.Error.Println(err.Error())
		handleError(w, fmt.Errorf("invalid Comment ID: %v", err), http.StatusBadRequest)
		return
	}

	err = database.ToggleCommentReaction(userID, commentID, "dislike")
	if err != nil {
		errLog.Error.Println(err.Error())
		handleError(w, fmt.Errorf("failed to dislike comment: %v", err), http.StatusInternalServerError)
		return
	}

	// Return updated reaction counts
	likes, dislikes, _ := database.GetCommentReactionCounts(commentID)

	sendSuccessResponse(w, http.StatusOK, map[string]any{
		"success":  true,
		"likes":    likes,
		"dislikes": dislikes,
	})
}
