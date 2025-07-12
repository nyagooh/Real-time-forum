package middleware

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"

	"forum/backend/database"
	"forum/backend/errLog"
)

type contextKey string

const UserIDKey contextKey = "userID"

func AuthMiddleware(db *sql.DB, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, err := database.GetUserIDFromSession(db, r)
		if err != nil {
			handleError(w, err, http.StatusInternalServerError)
			return
		}

		ctx := context.WithValue(r.Context(), UserIDKey, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func handleError(w http.ResponseWriter, err error, statusCode int) {
	errLog.Error.Println(err.Error())
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]any{
		"success": false,
		"message": err.Error(),
	})
}
