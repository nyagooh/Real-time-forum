package utils

import (
	"github.com/gofrs/uuid"
	"golang.org/x/crypto/bcrypt"
)

func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	return string(hash), err
}

func GenerateSessionToken() (string, error) {
	token, err := uuid.NewV4()

	return token.String(), err
}

func GenerateCSRFToken() (string, error) {
	token, err := uuid.NewV4()
	if err != nil {
		return "", err
	}
	return token.String(), nil
}
