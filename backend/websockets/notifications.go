package websockets

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"forum/backend/database"
	"forum/backend/errLog"
	"forum/backend/middleware"

	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer
	pongWait = 60 * time.Second

	// Send pings to peer with this period (must be less than pongWait)
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer
	// maxMessageSize = 512
)

var Upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// Allow all origins for development
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Global hub instance
var GlobalHub = NewHub()

// readPump pumps messages from the websocket connection to the hub
func (c *Client) ReadPump() {
	defer func() {
		GlobalHub.Unregister <- c
		c.Conn.Close()
	}()

	// c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				errLog.Error.Printf("Error reading message: %v\n", err)
			}
			break
		}

		// Process the message
		GlobalHub.ReceiveMessage(message, c)
		errLog.Info.Println("Message recieved")
	}
}

// writePump pumps messages from the hub to the websocket connection
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages to the current websocket message
			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// Initialize starts the hub
func Initialize() {
	go GlobalHub.Run()
}

type User struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Online   bool   `json:"online"`
	Lasttime string `json:"lasttime"`
}

var (
	clients     = make(map[*websocket.Conn]bool) // Track active WebSocket clients
	onlineUsers = make(map[int]bool)             // Track online users by user ID
	mu          sync.Mutex                       // Protect shared resources
)

// **Fetch all users from the database**
func fetchUsersByInteraction(db *sql.DB, userID int) ([]User, error) {
	// In notifications.go, replace the existing query in fetchUsersByInteraction
	query := `
       WITH last_messages AS (
			SELECT
        		u.id AS id,
        		u.nickname,
        		COALESCE(
            		(SELECT strftime('%Y-%m-%dT%H:%M:%SZ', MAX(m.timestamp))
             		FROM messages m
             		WHERE (m.sender_id = u.id AND m.receiver_id = ?)
                		OR (m.sender_id = ? AND m.receiver_id = u.id)
            		), 
            		''
        		) AS sort_time
    		FROM 
       			users u
    		WHERE 
        		u.id != ?
		)
		SELECT 
    		id AS id,
    		nickname,
    		sort_time
		FROM 
    		last_messages
		ORDER BY 
    		CASE WHEN sort_time = '' THEN 1 ELSE 0 END,
    		sort_time DESC,
    		nickname ASC;
    `

	rows, err := db.Query(query, userID, userID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var user User
		var lastMessageTime sql.NullString

		err := rows.Scan(&user.ID, &user.Username, &lastMessageTime)
		if err != nil {
			return nil, err
		}

		if lastMessageTime.Valid {
			// Parse the timestamp and format it
			if t, err := time.Parse("2006-01-02 15:04:05", lastMessageTime.String); err == nil {
				user.Lasttime = t.Format(time.RFC3339) // Convert to ISO8601 format
			} else {
				user.Lasttime = "" // If parsing fails, set empty string
			}
		} else {
			user.Lasttime = "" // Set empty string if no interaction
		}

		mu.Lock()
		user.Online = onlineUsers[user.ID]
		mu.Unlock()

		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return users, nil
}

// **Broadcast updates to all WebSocket clients**
func broadcastUpdate(users []User) {
	mu.Lock()
	defer mu.Unlock()

	message := map[string]any{
		"type":    "user_update",
		"success": true,
		"users":   users,
	}

	for client := range clients {
		err := client.WriteJSON(message)
		if err != nil {
			errLog.Error.Println("Error sending update:", err)
			client.Close()
			delete(clients, client)
		}
	}
}

// function to render initial site users
func RenderUsers(db *sql.DB) http.HandlerFunc {
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

		users, err := fetchUsersByInteraction(db, userID)
		if err != nil {
			errLog.Error.Println("Error fetching users:", err)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{"success": true, "users": users})
	}
}

// **Handle WebSocket connections**
func GetOnlineUsers(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		conn, err := Upgrader.Upgrade(w, r, nil)
		if err != nil {
			errLog.Error.Println("WebSocket upgrade error:", err)
			handleError(w, fmt.Errorf("failed to upgrade to WebSocket: %v", err), http.StatusInternalServerError)
			return
		}
		defer conn.Close()

		clients[conn] = true

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

		currentUser, err := database.GetUserByID(userID)
		if err != nil {
			errLog.Error.Println("Error fetching user:", err)
			return
		}

		mu.Lock()
		onlineUsers[userID] = true
		mu.Unlock()

		userStruct := User{
			ID:       userID,
			Username: currentUser,
			Online:   onlineUsers[userID],
			Lasttime: "",
		}

		// Update clients when a user comes online
		users, err := fetchUsersByInteraction(db, userID)
		if err != nil {
			errLog.Error.Println("Error fetching users:", err)
			return
		}
		
		users = append(users, userStruct)
		broadcastUpdate(users)
		errLog.Info.Println(users)

		// Keep connection alive, listen for disconnects
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				errLog.Error.Println("user list WebSocket disconnected:", err)
				break
			}
		}

		// Mark user as offline when they disconnect
		mu.Lock()
		delete(onlineUsers, userID)
		mu.Unlock()

		// Notify clients of the update
		users, _ = fetchUsersByInteraction(db, userID)

		userStruct.Online = onlineUsers[userID]
		users = append(users, userStruct)
		broadcastUpdate(users)

		delete(clients, conn)
	}
}

func handleError(w http.ResponseWriter, err error, statusCode int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]any{
		"success": false,
		"message": err.Error(),
	})
}
