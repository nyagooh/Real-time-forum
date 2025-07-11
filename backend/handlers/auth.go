package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"path/filepath"
	"time"

	"forum/backend/database"
	"forum/backend/errLog"
	"forum/backend/middleware"
	"forum/backend/models"
	"forum/backend/utils"

	"golang.org/x/crypto/bcrypt"
)

func RegisterHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {

		case http.MethodGet:
			http.ServeFile(w, r, filepath.Join("frontend", "index.html"))

		case http.MethodPost:
			user, err := parseAndValidateUserRequest(r)
			if err != nil {
				errLog.Error.Println(err.Error())
				handleError(w, err, http.StatusBadRequest)
				return
			}

			hashedPassword, err := utils.HashPassword(user.Password)
			if err != nil {
				errLog.Error.Println(err.Error())
				handleError(w, fmt.Errorf("failed to hash password: %v", err), http.StatusInternalServerError)
				return
			}
			user.Password = hashedPassword

			if err := database.InsertUser(user); err != nil {
				errLog.Error.Println(err.Error())
				handleError(w, fmt.Errorf("failed to insert user: %v", err), http.StatusInternalServerError)
				return
			}

			sendSuccessResponse(w, http.StatusOK, map[string]bool{"success": true})
		}
	}
}

func LoginHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {

		case http.MethodGet:
			http.ServeFile(w, r, filepath.Join("frontend", "index.html"))

		case http.MethodPost:
			credentials, err := parseAndValidateLoginRequest(r)
			if err != nil {
				errLog.Error.Println(err.Error())
				handleError(w, err, http.StatusBadRequest)
				return
			}

			user, hashedPassword, err := database.GetUser(credentials)
			if err != nil {
				errLog.Error.Println(err.Error())
				handleError(w, fmt.Errorf("invalid nickname or password"), http.StatusUnauthorized)
				return
			}

			if err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(credentials.Password)); err != nil {
				errLog.Error.Println(err.Error())
				handleError(w, fmt.Errorf("invalid nickname or password"), http.StatusUnauthorized)
				return
			}

			id, err := utils.StrToInt(user.ID)
			if err != nil {
				errLog.Error.Println(err.Error())
				handleError(w, fmt.Errorf("invalid id format: %v", err), http.StatusInternalServerError)
				return
			}

			existingSession, err := database.GetSessionToken(id)
			if err != nil {
				if !errors.Is(err, sql.ErrNoRows) {
					errLog.Error.Printf("Error fetching session: %v\n", err.Error())
					handleError(w, fmt.Errorf("server error: %w", err), http.StatusInternalServerError)
					return
				}
			}

			// If there's an existing session, delete it
			if existingSession != "" {
				if err := database.DeleteSession(id); err != nil {
					errLog.Error.Printf("Error deleting session: %v\n", err.Error())
					handleError(w, fmt.Errorf("server error: %w", err), http.StatusInternalServerError)
					return
				}
			}

			sessionToken, err := utils.GenerateSessionToken()
			if err != nil {
				errLog.Error.Println(err.Error())
				handleError(w, fmt.Errorf("server error: %v", err), http.StatusInternalServerError)
				return
			}

			expiresAt := time.Now().Add(24 * time.Hour)

			if err = database.InsertSession(id, sessionToken, expiresAt); err != nil {
				errLog.Error.Println(err.Error())
				handleError(w, fmt.Errorf("server error"), http.StatusInternalServerError)
				return
			}

			middleware.SetCookie(w, sessionToken, expiresAt)

			sendSuccessResponse(w, http.StatusOK, map[string]any{
				"success": true,
				"user":    user,
			})
		}
	}
}

func LogoutHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sessionToken, err := r.Cookie("session_token")
		if err != nil {
			errLog.Error.Println(err.Error())
			handleError(w, fmt.Errorf("no session token found"), http.StatusUnauthorized)
			return
		}

		if err := database.DeleteSessionByToken(sessionToken.Value); err != nil {
			errLog.Error.Println(err.Error())
			handleError(w, fmt.Errorf("server error"), http.StatusInternalServerError)
			return
		}

		middleware.DeleteCookie(w)

		sendSuccessResponse(w, http.StatusOK, map[string]bool{"success": true})
	}
}

func ValidateSession(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// validate session from sesssion_token cookie and return user data
		user, err := database.GetUserFromSession(db, r)
		if err != nil {
			errLog.Error.Println(err.Error())
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]any{
				"isLoggedIn": false,
				"success": false,
			})
			return
		}

		sendSuccessResponse(w, http.StatusOK, map[string]any{
			"success":    true,
			"user":       user,
			"isLoggedIn": true,
		})
	}
}

func parseAndValidateLoginRequest(r *http.Request) (models.Credentials, error) {
	var credentials models.Credentials

	if err := json.NewDecoder(r.Body).Decode(&credentials); err != nil {
		return models.Credentials{}, fmt.Errorf("failed to decode JSON: %v", err)
	}

	if credentials.Identity == "" || credentials.Password == "" {
		return models.Credentials{}, fmt.Errorf("identity and password are required")
	}

	return credentials, nil
}

func parseAndValidateUserRequest(r *http.Request) (models.User, error) {
	var user models.User

	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		return models.User{}, fmt.Errorf("failed to decode JSON: %v", err)
	}

	if err := utils.ValidateEmail(user.Email); err != nil {
		return models.User{}, fmt.Errorf("invalid email: %v", err)
	}

	return user, nil
}

func handleError(w http.ResponseWriter, err error, statusCode int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]any{
		"success": false,
		"message": err.Error(),
	})
}

func sendSuccessResponse(w http.ResponseWriter, statusCode int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(data)
}
