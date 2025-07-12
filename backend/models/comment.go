package models

type Comment struct {
    ID        int    `json:"id"`
    UserID    int    `json:"user_id"`
    Username  string `json:"username"`
    Content   string `json:"content"`
    CreatedAt string `json:"createdAt"`
    Likes     int    `json:"likes"`
	Dislikes  int    `json:"dislikes"`
    LikedBy   []string `json:"likedBy"`
    DislikedBy []string `json:"dislikedBy"`
}