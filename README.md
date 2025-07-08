# Real-time Forum

## Overview

A real-time forum application built as a single-page application with Go backend, WebSockets for real-time communication, and vanilla JavaScript frontend. Users can register, create posts with comments, and send private messages in real-time.

## Core Features

### Registration and Login
- **Complete Authentication System**: Users must register/login to access the forum
- **Registration Requirements**:
  - Nickname
  - Age
  - Gender
  - First Name
  - Last Name
  - E-mail
  - Password
- **Login Options**: Use either nickname or e-mail with password
- **Session Management**: Logout available from any page

### Posts and Comments
- **Post Creation**: Create posts with category associations
- **Commenting System**: Add comments to existing posts
- **Feed Display**: View posts in a feed-style layout
- **Click-to-View**: Comments visible only when clicking on a post

### Private Messages
- **Real-time Chat**: Send private messages using WebSockets
- **User Status**: Online/offline indicator for all users
- **Smart Organization**: User list sorted by last message sent (Discord-style)
- **Message History**: Load previous conversations with pagination
- **Scroll-to-Load**: Load 10 more messages when scrolling up (throttled/debounced)
- **Message Format**: Includes timestamp, sender username, and content

## Technology Stack

- **SQLite**: Data storage and persistence
- **Golang**: Backend server with WebSocket handling
- **JavaScript**: Frontend logic and WebSocket client management
- **HTML**: Single page application structure
- **CSS**: Styling and responsive design

## Architecture

This is a **Single Page Application (SPA)** where:
- Only one HTML file is used
- All page changes handled via JavaScript
- No page refreshes required
- Real-time updates via WebSockets

## Setup and Installation

### Prerequisites
- Go (version 1.21 or later)
- Modern web browser with WebSocket support

### Steps

1. **Clone the repository**:
   ```sh
   git clone <repository-url>
   cd Real-time-forum
   ```

2. **Build and run**:
   ```sh
   make run
   ```

3. **Access the application**:
   Open your web browser and navigate to http://localhost:8080

.

## Usage

### User Registration

- Navigate to the signup page.
- Provide your credentials.
- Click "Create account".

### User Login

- Navigate to the login page.
- Provide your username and password.
- Click "Sign in".

### Creating Posts and Comments

- After logging in, navigate to the dashboard.
- Click "Create New Post" to create a post.
- To comment on a post, navigate to the post's page and fill out the comment form.

### Liking and Disliking

- Click the like or dislike buttons on posts and comments to register your reaction.

### Filtering Posts

- Use the sidebar on the dashboard to filter posts by categories.

### Sending a message
- Navigate to the right side bar where there is a list of users.
- Click on the user you want to send a message to.
- A chat box will pop up where you will be able to type your message.
-If the other user is typing, you will be able to see.

## Testing

Unit tests are provided for various functionalities. To run the tests, use the following command:

```sh
go test ./...
```

## License

The project is licensed under the [LICENSE](LICENSE)