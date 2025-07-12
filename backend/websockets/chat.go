package websockets

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"forum/backend/database"
	"forum/backend/errLog"
	"forum/backend/models"

	"github.com/gorilla/websocket"
)

type Client struct {
	ID       string
	Conn     *websocket.Conn
	Send     chan []byte
	UserID   string
	Username string
}

// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
	Clients    map[string]*Client
	Register   chan *Client
	Unregister chan *Client
	Broadcast  chan []byte
	mutex      *sync.Mutex
}

func NewHub() *Hub {
	return &Hub{
		Clients:    make(map[string]*Client),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Broadcast:  make(chan []byte),
		mutex:      &sync.Mutex{},
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mutex.Lock()
			h.Clients[client.Username] = client
			h.mutex.Unlock()

		case client := <-h.Unregister:
			h.mutex.Lock()
			if _, exists := h.Clients[client.Username]; exists {
				delete(h.Clients, client.Username)
				close(client.Send)
			}
			h.mutex.Unlock()

		case message := <-h.Broadcast:
			h.mutex.Lock()

			for _, client := range h.Clients {
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					delete(h.Clients, client.Username)
				}
			}
			h.mutex.Unlock()
		}
	}
}

func (h *Hub) SendMessage(username string, message []byte) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	if client, exists := h.Clients[username]; exists {
		select {
		case client.Send <- message:
			errLog.Info.Println("Message sent to client")
		default:
			close(client.Send)
			delete(h.Clients, username)
		}
	} else if !exists {
		errLog.Info.Println("Client not found")
	}
}

func (h *Hub) ReceiveMessage(message []byte, sender *Client) error {
	var err error
	
	// First, try to parse as a generic message to determine the type
	var genericMsg struct {
		Type string `json:"type"`
	}
	
	if err := json.Unmarshal(message, &genericMsg); err != nil {
		return fmt.Errorf("error unmarshaling message: %v", err)
	}
	
	// Handle different message types
	switch genericMsg.Type {
	case "message":
		var msg models.Message
		if err := json.Unmarshal(message, &msg); err != nil {
			return fmt.Errorf("error unmarshaling message: %v", err)
		}

		msg.Sender = sender.Username
		msg.SenderID, err = database.GetUserID(msg.Sender)
		if err != nil {
			return err
		}

		msg.ReceiverID, err = database.GetUserID(msg.Receiver)
		if err != nil {
			return err
		}

		if msg.Timestamp.IsZero() {
			msg.Timestamp = time.Now()
		}

		err = database.SaveMessage(&msg)
		if err != nil {
			return fmt.Errorf("failed to save message: %v", err)
		}

		var data []byte
		data, err = json.Marshal(msg)
		if err != nil {
			return fmt.Errorf("error marshaling message: %v", err)
		}

		// Send message only to receiver
		h.SendMessage(msg.Receiver, data)
		
	case "typing":
		// Handle typing status updates - no need to save to database
		var typingMsg struct {
			Type     string `json:"type"`
			Sender   string `json:"sender"`
			Receiver string `json:"receiver"`
			IsTyping bool   `json:"isTyping"`
		}
		
		if err := json.Unmarshal(message, &typingMsg); err != nil {
			return fmt.Errorf("error unmarshaling typing message: %v", err)
		}
		
		// Override sender with actual username from websocket client
		typingMsg.Sender = sender.Username
		
		// Marshal the typing message with the corrected sender
		data, err := json.Marshal(typingMsg)
		if err != nil {
			return fmt.Errorf("error marshaling typing message: %v", err)
		}
		
		// Send typing status only to the receiver
		h.SendMessage(typingMsg.Receiver, data)
	}

	return nil
}