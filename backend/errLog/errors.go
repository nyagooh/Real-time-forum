package errLog

import (
	"fmt"
	"log"
	"os"
)

// Global variables for loggers and file handles
var (
	Info      *log.Logger
	Error     *log.Logger
	infoFile  *os.File
	errorFile *os.File
)

// Initialize loggers and keep file handles open
func InitLoggers() {
	var err error

	infoFile, err = os.OpenFile("backend/errLog/info.log", os.O_RDWR|os.O_CREATE|os.O_APPEND, 0666)
	if err != nil {
		log.Fatal("Failed to open info log file:", err)
	}

	errorFile, err = os.OpenFile("backend/errLog/error.log", os.O_RDWR|os.O_CREATE|os.O_APPEND, 0666)
	if err != nil {
		log.Fatal("Failed to open error log file:", err)
	}

	// Initialize global loggers
	Info = log.New(infoFile, "INFO\t", log.Ldate|log.Ltime|log.Lshortfile)
	Error = log.New(errorFile, "ERROR\t", log.Ldate|log.Ltime|log.Lshortfile)
}

// Close log files when the application shuts down
func CloseLoggers() {
	if infoFile != nil {
		infoFile.Close()
	}
	if errorFile != nil {
		errorFile.Close()
	}
	fmt.Println("Log files closed successfully.")
}
