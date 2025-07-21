package utils

import (
	"errors"
	"regexp"
)

func ValidateEmail(email string) error {
	rxEmail := regexp.MustCompile("^[a-zA-Z0-9.!#$%&'*+\\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$")

	if len(email) > 254 {
		return errors.New("email address is too long")
	}

	if !rxEmail.MatchString(email) {
		return errors.New("invalid email format")
	}

	return nil
}
