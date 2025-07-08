package database

import (
	"database/sql"
	"strings"

	"forum/backend/models"

	_ "github.com/mattn/go-sqlite3"
)

func InsertPost(userID int, post *models.Post) (int64, error) {
	query := `INSERT INTO posts (user_id, title, content, categories, image_url, created_at)
	VALUES (?, ?, ?, ?, ?, ?)`

	result, err := DB.Exec(query, userID, post.Title, post.Content, strings.Join(post.Category, ","), post.ImageURL, post.CreatedAt)
	if err != nil {
		return 0, err
	}

	// Retrieve the last inserted ID
	postID, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}

	return postID, nil
}

func GetAllPosts(category string) ([]*models.Post, error) {
	var rows *sql.Rows
	var err error
	query := `
	SELECT p.title, p.content, p.categories, p.image_url, u.nickname,
	IFNULL(likes.count, 0) AS likes,
	IFNULL(dislikes.count, 0) AS dislikes,
	p.created_at,
	p.id,
	IFNULL(comments.count, 0) AS comments_count,
	IFNULL(liked_by.usernames, '') AS liked_by,
	IFNULL(disliked_by.usernames, '') AS disliked_by
	FROM posts p
	JOIN users u ON p.user_id = u.id
	LEFT JOIN (
		SELECT post_id, COUNT(*) AS count
		FROM post_reactions
		WHERE reaction = 'like'
		GROUP BY post_id
	) AS likes ON p.id = likes.post_id
	LEFT JOIN (
		SELECT post_id, COUNT(*) AS count
		FROM post_reactions
		WHERE reaction = 'dislike'
		GROUP BY post_id
	) AS dislikes ON p.id = dislikes.post_id
	LEFT JOIN (
		SELECT post_id, COUNT(*) AS count
		FROM comments
		GROUP BY post_id
	) AS comments ON p.id = comments.post_id
	LEFT JOIN (
		SELECT pr.post_id, GROUP_CONCAT(u.nickname) AS usernames
		FROM post_reactions pr
		JOIN users u ON pr.user_id = u.id
		WHERE pr.reaction = 'like'
		GROUP BY pr.post_id
	) AS liked_by ON p.id = liked_by.post_id
	LEFT JOIN (
		SELECT pr.post_id, GROUP_CONCAT(u.nickname) AS usernames
		FROM post_reactions pr
		JOIN users u ON pr.user_id = u.id
		WHERE pr.reaction = 'dislike'
		GROUP BY pr.post_id
	) AS disliked_by ON p.id = disliked_by.post_id`

	if category != "" {
		query += ` WHERE p.categories LIKE '%' || ? || '%'`
		query += ` ORDER BY p.created_at DESC`
		rows, err = DB.Query(query, category)
	} else {
		query += ` ORDER BY p.created_at DESC`
		rows, err = DB.Query(query)
	}

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []*models.Post
	for rows.Next() {
		post := &models.Post{}
		var categories string
		var commentsCount int
		var likedByStr, dislikedByStr string
		err := rows.Scan(
			&post.Title,
			&post.Content,
			&categories,
			&post.ImageURL,
			&post.Username,
			&post.Likes,
			&post.Dislikes,
			&post.CreatedAt,
			&post.ID,
			&commentsCount,
			&likedByStr,
			&dislikedByStr,
		)
		if err != nil {
			return nil, err
		}

		post.Category = strings.Split(categories, ",")
		// Parse likedBy and dislikedBy strings into arrays
		if likedByStr != "" {
			post.LikedBy = strings.Split(likedByStr, ",")
		} else {
			post.LikedBy = []string{}
		}
		if dislikedByStr != "" {
			post.DislikedBy = strings.Split(dislikedByStr, ",")
		} else {
			post.DislikedBy = []string{}
		}

		// Now fetch the comments for this post
		commentRows, err := DB.Query(`
		SELECT 
			c.id, 
			c.content, 
			c.user_id, 
			u.nickname, 
			c.created_at,
			IFNULL(likes.count, 0) AS likes,
			IFNULL(dislikes.count, 0) AS dislikes,
			IFNULL(liked_by.usernames, '') AS liked_by,
			IFNULL(disliked_by.usernames, '') AS disliked_by
		FROM comments c
		JOIN users u ON c.user_id = u.id
		LEFT JOIN (
			SELECT comment_id, COUNT(*) AS count
			FROM comment_reactions
			WHERE reaction = 'like'
			GROUP BY comment_id
		) AS likes ON c.id = likes.comment_id
		LEFT JOIN (
			SELECT comment_id, COUNT(*) AS count
			FROM comment_reactions
			WHERE reaction = 'dislike'
			GROUP BY comment_id
		) AS dislikes ON c.id = dislikes.comment_id
		LEFT JOIN (
			SELECT cr.comment_id, GROUP_CONCAT(u.nickname) AS usernames
			FROM comment_reactions cr
			JOIN users u ON cr.user_id = u.id
			WHERE cr.reaction = 'like'
			GROUP BY cr.comment_id
		) AS liked_by ON c.id = liked_by.comment_id
		LEFT JOIN (
			SELECT cr.comment_id, GROUP_CONCAT(u.nickname) AS usernames
			FROM comment_reactions cr
			JOIN users u ON cr.user_id = u.id
			WHERE cr.reaction = 'dislike'
			GROUP BY cr.comment_id
		) AS disliked_by ON c.id = disliked_by.comment_id
		WHERE c.post_id = ?
		ORDER BY c.created_at
		`, post.ID)
		if err != nil {
			return nil, err
		}

		var comments []models.Comment
		for commentRows.Next() {
			var comment models.Comment
			var commentLikedByStr, commentDislikedByStr string
			err := commentRows.Scan(
				&comment.ID,
				&comment.Content,
				&comment.UserID,
				&comment.Username,
				&comment.CreatedAt,
				&comment.Likes,
				&comment.Dislikes,
				&commentLikedByStr,
				&commentDislikedByStr,
			)
			if err != nil {
				commentRows.Close()
				return nil, err
			}

			// Parse comment likedBy and dislikedBy strings into arrays
			if commentLikedByStr != "" {
				comment.LikedBy = strings.Split(commentLikedByStr, ",")
			} else {
				comment.LikedBy = []string{}
			}
			if commentDislikedByStr != "" {
				comment.DislikedBy = strings.Split(commentDislikedByStr, ",")
			} else {
				comment.DislikedBy = []string{}
			}

			comments = append(comments, comment)
		}
		commentRows.Close()
		post.Comments = comments
		posts = append(posts, post)
	}

	return posts, nil
}
