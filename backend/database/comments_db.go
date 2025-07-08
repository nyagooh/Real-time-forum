package database

import (
	"time"

	"forum/backend/models"
)

func AddComment(postID, userID int, post *models.Post) error {
	var username string
	err := DB.QueryRow("SELECT nickname FROM users WHERE id = ?", userID).Scan(&username)
	if err != nil {
		return err
	}

	query := `INSERT INTO comments (post_id, user_id, username, content, created_at) 
              VALUES (?, ?, ?, ?, ?)`

	createdAt := time.Now().Format(time.RFC3339)
	_, err = DB.Exec(query, postID, userID, username, post.Content, createdAt)
	if err != nil {
		return err
	}

	// Get the last inserted ID
	var commentID int
	err = DB.QueryRow("SELECT last_insert_rowid()").Scan(&commentID)
	if err != nil {
		return err
	}

	// Set the comment ID in the post object
	post.Comments = append(post.Comments, models.Comment{
		ID:        commentID,
		UserID:    userID,
		Username:  username,
		Content:   post.Content,
		CreatedAt: createdAt,
	})

	return nil
}
