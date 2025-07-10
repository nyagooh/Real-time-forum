package models

type Post struct {
	ID int			  `json:"id"`
	Username string   `json:"username"`
	Title    string   `json:"title"`
	Content  string   `json:"content"`
	Category []string `json:"categories"`
	ImageURL string   `json:"imageURL"`
	Likes    int      `json:"likes"`
	Dislikes int      `json:"dislikes"`
	CreatedAt string  `json:"createdAt"`
	Comments  []Comment `json:"comments"`
	LikedBy []string  `json:"likedBy"`
	DislikedBy []string `json:"dislikedBy"`
}
