package utils

import (
	"testing"

	"forum/backend/utils"

	"golang.org/x/crypto/bcrypt"
)

func TestHashPassword(t *testing.T) {
	password := "securepassword123"

	// Test successful hashing
	hashedPassword, err := utils.HashPassword(password)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// Verify the hashed password matches the original password
	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	if err != nil {
		t.Errorf("expected password to match, got error: %v", err)
	}

	// Test hashing with an empty password
	emptyPassword := ""
	_, err = utils.HashPassword(emptyPassword)
	if err != nil {
		t.Fatalf("expected no error for empty password, got %v", err)
	}
}
