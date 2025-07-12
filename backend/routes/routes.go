package routes

import (
	"database/sql"
	"net/http"
	"path/filepath"
	"strings"

	"forum/backend/handlers"
	"forum/backend/middleware"
	ws "forum/backend/websockets"
)

func Routes(db *sql.DB) http.Handler {
	ws.Initialize()

	mux := http.NewServeMux()

	fs := http.FileServer(http.Dir("frontend/assets"))
	mux.Handle("/assets/", http.StripPrefix("/assets/", fs))

	// Authentication Routes
	mux.HandleFunc("/register", handlers.RegisterHandler(db))
	mux.HandleFunc("/login", handlers.LoginHandler(db))
	mux.HandleFunc("/logout", handlers.LogoutHandler(db))

	// Web Socket Routes
	mux.Handle("/ws", middleware.AuthMiddleware(db,
		handlers.ServeWs(db)),
	)
	mux.Handle("/users", middleware.AuthMiddleware(db,
		ws.GetOnlineUsers(db)),
	)

	mux.Handle("/render-users", middleware.AuthMiddleware(db,
		ws.RenderUsers(db)),
	)

	// Fetch messages
	mux.Handle("/messages", middleware.AuthMiddleware(db,
		http.HandlerFunc(handlers.GetMessages(db))),
	)

	// Validate session
	mux.HandleFunc("/auth/status", handlers.ValidateSession(db))

	// Implement middleware
	mux.Handle("/posts", middleware.AuthMiddleware(db,
		http.HandlerFunc(handlers.CreatePostHandler)),
	)
	mux.Handle("/likes", middleware.AuthMiddleware(db,
		http.HandlerFunc(handlers.LikePostHandler)),
	)
	mux.Handle("/dislikes", middleware.AuthMiddleware(db,
		http.HandlerFunc(handlers.DislikePostHandler)),
	)
	mux.Handle("/comments", middleware.AuthMiddleware(db,
		http.HandlerFunc(handlers.AddCommentHandler)),
	)
	mux.Handle("/like-comment", middleware.AuthMiddleware(db,
		http.HandlerFunc(handlers.LikeCommentHandler)),
	)
	mux.Handle("/dislike-comment", middleware.AuthMiddleware(db,
		http.HandlerFunc(handlers.DislikeCommentHandler)),
	)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") || strings.HasPrefix(r.URL.Path, "/assets/") {
			http.NotFound(w, r)
			return
		}

		http.ServeFile(w, r, filepath.Join("frontend", "index.html"))
	})

	return middleware.SecureHeaders(mux)
}
