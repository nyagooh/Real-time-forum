package database

import (
	"database/sql"
	"fmt"

	"forum/backend/errLog"
	m "forum/backend/models"
)

func SaveMessage(msg *m.Message) error {
	query := `
	INSERT INTO messages (sender_id, sender, receiver_id, receiver, content)
	VALUES (?, ?, ?, ?, ?)`
	_, err := DB.Exec(query, msg.SenderID, msg.Sender, msg.ReceiverID, msg.Receiver, msg.Content)
	if err != nil {
		return fmt.Errorf("error storing message: %v", err)
	}
	return nil
}

func GetMessages(db *sql.DB, sender, receiver string, offset, limit int) ([]m.Message, error) {
	query := `
	SELECT sender_id, sender, receiver_id, receiver, content, timestamp
	FROM messages
	WHERE (sender = ? AND receiver = ?)
	OR (sender = ? AND receiver = ?)
	ORDER BY timestamp DESC
	LIMIT ? OFFSET ?`

	rows, err := db.Query(query, sender, receiver, receiver, sender, limit, offset)
	if err != nil {
		errLog.Error.Println(err.Error())
		return nil, err
	}
	defer rows.Close()

	var messages []m.Message
	for rows.Next() {
		var message m.Message
		if err := rows.Scan(&message.SenderID, &message.Sender, &message.ReceiverID, &message.Receiver, &message.Content, &message.Timestamp); err != nil {
			errLog.Error.Println(err.Error())
			return nil, err
		}
		messages = append(messages, message)
	}

	return messages, nil
}
