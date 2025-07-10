package models

import "time"

type Message struct {
	Type       string    `json:"type"`
	SenderID   int       `json:"sender_id"`
	Sender     string    `json:"sender"`
	ReceiverID int       `json:"receiver_id"`
	Receiver   string    `json:"receiver"`
	Content    string    `json:"content"`
	Timestamp  time.Time `json:"timestamp"`
}

// TypingNotification represents a typing status notification
type TypingNotification struct {
	Type     string `json:"type"`
	Sender   string `json:"sender"`
	SenderID int    `json:"sender_id"`
	Receiver string `json:"receiver"`
	IsTyping bool   `json:"isTyping"`
}
