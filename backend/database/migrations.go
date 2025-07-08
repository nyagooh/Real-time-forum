package database

import (
	"database/sql"

	"forum/backend/errLog"
)

var DB *sql.DB

func InitDB() (*sql.DB, error) {
	var err error
	DB, err = sql.Open("sqlite3", "./forum.db")
	if err != nil {
		return nil, err
	}

	CreateTables()
	return DB, nil
}

func CreateTables() {
	usersTable := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		nickname VARCHAR(255) UNIQUE NOT NULL,
		age INTEGER NOT NULL,
		gender TEXT,
		firstname TEXT NOT NULL,
		lastname TEXT NOT NULL,
		email VARCHAR(255) UNIQUE NOT NULL,
		password CHAR(60) DEFAULT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	
	CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`
	_, err := DB.Exec(usersTable)
	if err != nil {
		errLog.Error.Printf("Failed to create users table: %v\n", err)
		return
	}

	postTable := `
	CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        categories TEXT NOT NULL,
		image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users (id)
    );`
	_, err = DB.Exec(postTable)
	if err != nil {
		errLog.Error.Printf("Failed to create posts table: %v\n", err)
		return
	}

	reactionTable := `
	CREATE TABLE IF NOT EXISTS post_reactions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		post_id INTEGER NOT NULL,
		reaction TEXT CHECK(reaction IN ('like', 'dislike')) NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users (id),
		FOREIGN KEY (post_id) REFERENCES posts (id),
		UNIQUE(user_id, post_id)
	);`
	_, err = DB.Exec(reactionTable)
	if err != nil {
		errLog.Error.Printf("Failed to create reaction table: %v\n", err)
		return
	}

	sessionTable := `
    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        session_token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    );`

	_, err = DB.Exec(sessionTable)
	if err != nil {
		errLog.Error.Printf("Failed to create sessions table: %v\n", err)
		return
	}

	commentTable := `
    CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
    );`
	_, err = DB.Exec(commentTable)
	if err != nil {
		errLog.Error.Printf("Failed to create comments table: %v\n", err)
	}

	messageTable := `
	CREATE TABLE IF NOT EXISTS messages (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		sender_id TEXT NOT NULL,
		receiver_id TEXT NOT NULL,
		sender INTEGER NOT NULL,
		receiver INTEGER NOT NULL,
		content TEXT NOT NULL,
		timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (sender) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY (receiver) REFERENCES users(id) ON DELETE CASCADE
	);
	
	CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);`
	_, err = DB.Exec(messageTable)
	if err != nil {
		errLog.Error.Printf("Failed to create message table: %v\n", err)
		return
	}

	commentReactionTable := `
    CREATE TABLE IF NOT EXISTS comment_reactions (
        user_id INTEGER,
        comment_id INTEGER,
        reaction TEXT CHECK(reaction IN ('like', 'dislike')),
        PRIMARY KEY (user_id, comment_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (comment_id) REFERENCES comments(id)
    );`
	_, err = DB.Exec(commentReactionTable)
	if err != nil {
		errLog.Error.Printf("Failed to create comment_reactions table: %v\n", err)
		return
	}
}
