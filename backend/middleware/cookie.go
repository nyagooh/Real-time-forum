package middleware

import (
	"net/http"
	"time"
)

func SetCookie(w http.ResponseWriter, token string, expiresAt time.Time) {
	http.SetCookie(w, &http.Cookie{
		Path:     "/",
		Name:     "session_token",
		Value:    token,
		Expires:  expiresAt,
		HttpOnly: true,                    // Prevent JavaScript access
		SameSite: http.SameSiteStrictMode, // Prevent CSRF
	})
}

func SetCSRFCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Path:     "/",
		Name:     "csrf_token",
		Value:    token,
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	})
}

func DeleteCookie(w http.ResponseWriter) {
	// Delete session cookie
	http.SetCookie(w, &http.Cookie{
		Name:   "session_token",
		MaxAge: -1,
		Value: "",
		Expires:  time.Now(),
	})
}