package database

import "database/sql"

func ToggleCommentReaction(userID, commentID int, reaction string) error {
	var existingReaction string
	query := `SELECT reaction FROM comment_reactions WHERE user_id = ? AND comment_id = ?`
	err := DB.QueryRow(query, userID, commentID).Scan(&existingReaction)

	if err == sql.ErrNoRows {
		// No existing reaction, insert a new one
		insertQuery := `INSERT INTO comment_reactions (user_id, comment_id, reaction) VALUES (?, ?, ?)`
		_, err := DB.Exec(insertQuery, userID, commentID, reaction)
		return err
	} else if err != nil {
		return err
	}

	if existingReaction == reaction {
		// Remove reaction if clicking the same button
		deleteQuery := `DELETE FROM comment_reactions WHERE user_id = ? AND comment_id = ?`
		_, err := DB.Exec(deleteQuery, userID, commentID)
		return err
	} else {
		// Update existing reaction
		updateQuery := `UPDATE comment_reactions SET reaction = ? WHERE user_id = ? AND comment_id = ?`
		_, err := DB.Exec(updateQuery, reaction, userID, commentID)
		return err
	}
}

// GetCommentReactionCounts returns the number of likes and dislikes for a comment
func GetCommentReactionCounts(commentID int) (likes int, dislikes int, err error) {
	likesQuery := `SELECT COUNT(*) FROM comment_reactions WHERE comment_id = ? AND reaction = 'like'`
	dislikesQuery := `SELECT COUNT(*) FROM comment_reactions WHERE comment_id = ? AND reaction = 'dislike'`

	err = DB.QueryRow(likesQuery, commentID).Scan(&likes)
	if err != nil {
		return 0, 0, err
	}

	err = DB.QueryRow(dislikesQuery, commentID).Scan(&dislikes)
	if err != nil {
		return 0, 0, err
	}

	return likes, dislikes, nil
}