package database

import "database/sql"

// AddReaction toggles a like or dislike reaction on a post.
func ToggleReaction(userID, postID int, reaction string) error {
	var existingReaction string

	query := `SELECT reaction FROM post_reactions WHERE user_id = ? AND post_id = ?`
	err := DB.QueryRow(query, userID, postID).Scan(&existingReaction)

	if err == sql.ErrNoRows {
		insertQuery := `INSERT INTO post_reactions (user_id, post_id, reaction) VALUES (?, ?, ?)`
		_, err := DB.Exec(insertQuery, userID, postID, reaction)
		return err
	} else if err != nil {
		return err
	}

	if existingReaction == reaction {
		deleteQuery := `DELETE FROM post_reactions WHERE user_id = ? AND post_id = ?`
		_, err := DB.Exec(deleteQuery, userID, postID)
		return err
	}

	updateQuery := `UPDATE post_reactions SET reaction = ? WHERE user_id = ? AND post_id = ?`
	_, err = DB.Exec(updateQuery, reaction, userID, postID)
	return err
}

// GetReactionCounts returns the number of likes and dislikes for a post.
func GetReactionCounts(postID int) (int, int, error) {
	var likes, dislikes int

	likeQuery := `SELECT COUNT(*) FROM post_reactions WHERE post_id = ? AND reaction = 'like'`
	err := DB.QueryRow(likeQuery, postID).Scan(&likes)
	if err != nil {
		return 0, 0, err
	}

	dislikeQuery := `SELECT COUNT(*) FROM post_reactions WHERE post_id = ? AND reaction = 'dislike'`
	err = DB.QueryRow(dislikeQuery, postID).Scan(&dislikes)
	if err != nil {
		return 0, 0, err
	}

	return likes, dislikes, nil
}
