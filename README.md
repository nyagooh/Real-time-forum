# typing-in-progress

## Overview

The project is a web forum that allows users to communicate with each other by creating posts and comments and sending each other private messages. The forum supports associating categories with posts, liking and disliking posts and comments, and filtering posts. It also has a typing in progress engine that people can see that a user is typing in real time. The project uses SQLite for data storage.

## Features

- **User Authentication**: Users can register, log in, and log out. User sessions are managed using cookies.
- **Post and Comment Creation**: Registered users can create posts and comments.
- **Private Messages**: Registered uers can send each other direct, private messages.
- **Typing in progress engine**: If you start typing to a certain user this user will be able to see that you are typing.
- **Categories**: Posts can be associated with one or more categories.
- **Likes and Dislikes**: Registered users can like or dislike posts and comments.
- **Filtering**: Users can filter posts by categories, created posts, and liked posts.
- **Error Handling**: The application handles various HTTP and technical errors gracefully.

## Technologies Used

- **Go**: The primary programming language used for the backend.
- **SQLite**: The database used for storing user, post, and comment data.
- **HTML/CSS/JavaScript**: Used for the frontend.


## Setup and Installation

### Prerequisites

- Go (version 1.22.2 or later)

### Steps

1. **Clone the repository**:
   ```sh
   git clone https://learn.zone01kisumu.ke/git/togondol/real-time-forum-typing-in-progress
   cd real-time-forum-typing-in-progress
   ```

2. **cd into the directory**:
   ```sh
   cd real-time-forum-typing-in-progress
   ```

3. **Access the application**:
   Open your web browser and navigate to 
   
   http://localhost:8080

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