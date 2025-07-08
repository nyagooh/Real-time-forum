package database

import (
	"database/sql"
	"fmt"
	"forum/backend/errLog"
	"forum/backend/models"
)

func InsertUser(user models.User) error {
	query := `INSERT INTO users (nickname, age, gender, firstname, lastname, email, password)
	VALUES (?, ?, ?, ?, ?, ?, ?)`
	_, err := DB.Exec(query, user.Nickname, user.Age, user.Gender, user.Firstname, user.Lastname, user.Email, user.Password)

	return err
}

func GetUser(credential models.Credentials) (user models.UserIdentity, check string, err error) {
	query := `
	SELECT id, nickname, email, password
	FROM users
	WHERE (nickname = ? OR email = ?)`

	err = DB.QueryRow(query, credential.Identity, credential.Identity).Scan(&user.ID, &user.Nickname, &user.Email, &check)
	if err != nil {
		if err == sql.ErrNoRows {
			return user, "", fmt.Errorf("user not found: %v", err)
		}
		return user, "", err
	}

	return user, check, err
}

func GetUsers() ([]string, error) {
	query := `
	SELECT nickname
	FROM users
	`
	rows, err := DB.Query(query)
	if err != nil {
		errLog.Error.Println(err.Error())
		return nil, err
	}
	defer rows.Close()

	var users []string
	for rows.Next() {
		var user string
		if err := rows.Scan(&user); err != nil {
			errLog.Error.Println(err.Error())
			return nil, err
		}
		users = append(users, user)
	}

	if err = rows.Err(); err != nil {
		errLog.Error.Println(err.Error())
		return nil, err
	}

	return users, nil
}

func GetUserID(identity string) (int, error) {
	query := `
        SELECT id 
        FROM users 
        WHERE nickname = ? OR email = ?
		LIMIT 1`

	var userID int
	err := DB.QueryRow(query, identity, identity).Scan(&userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return 0, fmt.Errorf("user not found: %v", err)
		}
		return 0, fmt.Errorf("database error: %v", err)
	}

	return userID, nil
}

func GetUserByID(id int) (string, error) {
	query := `
	SELECT nickname
	FROM users
	WHERE id = ?`

	var nickname string
	err := DB.QueryRow(query, id).Scan(&nickname)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", fmt.Errorf("user not found: %v", err)
		}
		return "", fmt.Errorf("database error: %v", err)
	}

	return nickname, nil
}
