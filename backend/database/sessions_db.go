package database

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"time"

	"forum/backend/errLog"
	"forum/backend/models"
)

func InsertSession(id int, session string, expiresAt time.Time) error {
	query := `
	INSERT INTO sessions (user_id, session_token, expires_at)
	VALUES (?, ?, ?)`

	_, err := DB.Exec(query, id, session, expiresAt)

	return err
}

func GetSessionToken(id int) (string, error) {
	var sessionToken string

	query := `
	SELECT session_token
	FROM sessions
	WHERE user_id = ? AND expires_at > ?`

	err := DB.QueryRow(query, id, time.Now()).Scan(&sessionToken)
	if err != nil {
		return "", err
	}

	return sessionToken, nil
}

func DeleteSession(id int) error {
	query := `
	DELETE FROM sessions
	WHERE user_id = ?`

	_, err := DB.Exec(query, id)

	return err
}

func DeleteSessionByToken(token string) error {
	query := `
	DELETE FROM sessions
	WHERE session_token = ?`

	_, err := DB.Exec(query, token)

	return err
}

func GetUserIDFromSession(db *sql.DB, r *http.Request) (int, error) {
	sessionCookie, err := r.Cookie("session_token")
	if err != nil {
		return 0, fmt.Errorf("session token not found: %v", err)
	}
	sessionToken := sessionCookie.Value

	var userID int
	var expiresAt time.Time

	query := `
	SELECT user_id, expires_at
	FROM sessions
	WHERE session_token = ? AND expires_at > ?`

	err = db.QueryRow(query, sessionToken, time.Now()).Scan(&userID, &expiresAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, fmt.Errorf("sql.ErrNoRows")
		}
		return 0, fmt.Errorf("database error: %v", err)
	}

	return userID, nil
}

func GetUserFromSession(db *sql.DB, r *http.Request) (*models.UserIdentity, error) {
	sessionCookie, err := r.Cookie("session_token")
	if err != nil {
		return nil, fmt.Errorf("session token not found: %v", err)
	}
	sessionToken := sessionCookie.Value

	query := `
	SELECT user_id
	FROM sessions
	WHERE session_token = ? AND expires_at > ?`
	
	var userID int
	err = db.QueryRow(query, sessionToken, time.Now()).Scan(&userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("no user found for the session token")
		}
		return nil, fmt.Errorf("database error: %v", err)
	}

	var user models.UserIdentity
	query = `
	SELECT id, nickname, email
	FROM users
	WHERE id = ?`

	err = db.QueryRow(query, userID).Scan(&user.ID, &user.Nickname, &user.Email)
	if err != nil {
		return nil, fmt.Errorf("database error: %v", err)
	}

	return &user, nil
}

func StartSessionCleanup(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for range ticker.C {
		cleanupExpiredSessions(DB)
	}
}

func cleanupExpiredSessions(db *sql.DB) {
	query := `
	DELETE FROM sessions
	WHERE expires_at < ?`

	_, err := db.Exec(query, time.Now())
	if err != nil {
		errLog.Error.Println(err.Error())
		return
	}
}
