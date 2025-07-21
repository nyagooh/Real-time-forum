package main

import (
	"flag"
	"fmt"
	"net/http"
	"time"

	"github.com/nyagooh/Real-time-forum.git/backend/database"
	"github.com/nyagooh/Real-time-forum.git/backend/errLog"
	"github.com/nyagooh/Real-time-forum.git/backend/routes"
)

func main() {
	errLog.InitLoggers()
	defer errLog.CloseLoggers()

	db, err := database.InitDB()
	if err != nil {
		errLog.Error.Printf("Failed to connect to database: %v\n", err)
		return
	}
	errLog.Info.Println("database initialized successfully")

	addr := flag.String("addr", ":8080", "HTTP network address")

	go database.StartSessionCleanup(time.Hour)

	flag.Parse()

	mux := routes.Routes(db)

	srv := &http.Server{
		Addr:     *addr,
		ErrorLog: errLog.Error,
		Handler:  mux,
	}

	errLog.Info.Printf("Server starting on port http://localhost%s/\n", *addr)
	fmt.Printf("Server starting on port http://localhost%s/\n", *addr)

	err = srv.ListenAndServe()
	errLog.Error.Fatal(err)
}
