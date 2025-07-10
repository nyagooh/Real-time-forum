package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"

	"forum/backend/database"
	"forum/backend/errLog"
	"forum/backend/middleware"
	ws "forum/backend/websockets"
)

// ServeWs handles websocket requests from clients
func ServeWs(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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

		query := `
		SELECT nickname
		FROM users
		WHERE id = ?`

		var username string
		err := db.QueryRow(query, userID).Scan(&username)
		if err != nil {
			errLog.Error.Println(err.Error())
			handleError(w, fmt.Errorf("error retrieving username: %v", err), http.StatusInternalServerError)
			return
		}

		// Upgrade connection to websocket
		conn, err := ws.Upgrader.Upgrade(w, r, nil)
		if err != nil {
			errLog.Info.Println("Upgradingconnection")
			handleError(w, fmt.Errorf("error upgrading connection: %v", err), http.StatusInternalServerError)
			return
		}

		// Create a new client
		client := &ws.Client{
			ID:       strconv.Itoa(userID),
			Conn:     conn,
			Send:     make(chan []byte, 256),
			UserID:   strconv.Itoa(userID),
			Username: username,
		}

		// Register client with hub
		ws.GlobalHub.Register <- client
		// errLog.Info.Println("Client registered")

		// Start goroutines for reading and writing
		go client.WritePump()
		go client.ReadPump()
	}
}

func GetMessages(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			sender := r.URL.Query().Get("sender")
			receiver := r.URL.Query().Get("receiver")
			offset := r.URL.Query().Get("offset")
			limit := r.URL.Query().Get("limit")

			offsetInt, err := strconv.Atoi(offset)
			if err != nil {
				offsetInt = 0
			}

			limitInt, err := strconv.Atoi(limit)
			if err != nil {
				limitInt = 10
			}

			messages, err := database.GetMessages(db, sender, receiver, offsetInt, limitInt)
			if err != nil {
				errLog.Error.Println(err.Error())
				handleError(w, fmt.Errorf("error retrieving messages: %v", err), http.StatusInternalServerError)
				return
			}

			sendSuccessResponse(w, http.StatusOK, messages)
		default:
			handleError(w, fmt.Errorf("method not allowed"), http.StatusMethodNotAllowed)
		}
	}
}
