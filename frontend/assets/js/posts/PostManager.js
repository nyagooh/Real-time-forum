import { PostUI } from "../ui/components/PostUI.js";

export class PostManager {
  constructor(stateManager) {
    this.state = stateManager;
    this.bindEvents();

    // Fetch posts when posts:fetch event is triggered
    document.addEventListener("posts:fetch", () => {
      this.fetchPosts();
    });
  }

  bindEvents() {
    document.addEventListener("click", (e) => {
      if (e.target.closest(".category-link")) {
        e.preventDefault();
        const categoryLink = e.target.closest(".category-link");
        const category = categoryLink.dataset.category;
        this.filterPostsByCategory(category);
      }
    });

    document.addEventListener("click", (e) => {
      if (e.target.matches(".comment-input")) {
        // Make sure the event doesn't get captured by other handlers
        e.stopPropagation();
      }
    });

    document.addEventListener("input", (e) => {
      if (e.target.matches(".comment-input")) {
        e.stopPropagation();
      }
    });

    document.addEventListener("submit", (e) => {
      console.log("Form submitted:", e.target);
      if (e.target.id === "postForm") {
        e.preventDefault();
        this.handleCreatePost(e);
      } else if (e.target.matches(".comment-form")) {
        console.log("Comment form submitted");
        e.preventDefault();
        const postId = e.target.closest(".post").dataset.postId;
        this.handleAddComment(postId, e);
      }
    });

    document.addEventListener("click", (e) => {
      // Handle clicks on post like/dislike buttons
      if (e.target.closest(".post-actions .like-btn")) {
        const postId = e.target.closest(".post").dataset.postId;
        this.handleLikePost(parseInt(postId));
      } else if (e.target.closest(".post-actions .dislike-btn")) {
        const postId = e.target.closest(".post").dataset.postId;
        this.handleDislikePost(parseInt(postId));
        document.dispatchEvent(new CustomEvent("post:disliked"));

        // Handle clicks on comment like/dislike buttons
      } else if (e.target.closest(".comment .like-btn")) {
        const comment = e.target.closest(".comment");
        const post = e.target.closest(".post");
        const postId = post.dataset.postId;
        const commentId = comment.dataset.commentId;
        this.handleLikeComment(parseInt(postId), parseInt(commentId));
      } else if (e.target.closest(".comment .dislike-btn")) {
        const comment = e.target.closest(".comment");
        const post = e.target.closest(".post");
        const postId = post.dataset.postId;
        const commentId = comment.dataset.commentId;
        this.handleDislikeComment(parseInt(postId), parseInt(commentId));
      } else if (e.target.id === "createPostBtn") {
        this.showCreatePostForm();
      } else if (e.target.id === "cancelPost") {
        this.hideCreatePostForm();
      } else if (e.target.closest(".comment-toggle")) {
        const postId = e.target.closest(".post").dataset.postId;
        this.showPostDetail(postId);
      } else if (
        e.target.closest(".post") &&
        !e.target.closest(".comment-input") &&
        !e.target.closest(".comment-form") &&
        !e.target.closest(".post-actions")
      ) {
        const postId = e.target.closest(".post").dataset.postId;
        this.showPostDetail(postId);
      } else if (e.target.id === "backToFeed") {
        this.showFeed();
      }
    });
  }

  showPostDetail(postId) {
    const state = this.state.getState();
    const post = state.posts.find((post) => post.id === parseInt(postId));
    if (post) {
      // Update the state to track that we're in detail view
      this.state.setState({
        currentView: "detail",
        currentPostId: parseInt(postId),
      });
      const postsContainer = document.getElementById("postsContainer");
      postsContainer.innerHTML = PostUI.getPostDetailView(post);
    }
  }

  showFeed() {
    // Update the state to track that we're in feed view
    this.state.setState({
      currentView: "feed",
      currentPostId: null,
      currentCategory: null,
    });
    const state = this.state.getState();
    const postsContainer = document.getElementById("postsContainer");
    const postsHTML =
      state.posts.length > 0
        ? state.posts.map((post) => PostUI.createPostHTML(post)).join("")
        : `<article class="post">
          <h2>Welcome!</h2>
          <p>No posts yet. Be the first to create a post!</p>
         </article>`;
    postsContainer.innerHTML = postsHTML;
  }

  filterPostsByCategory(category) {
    this.state.setState({
      currentView: "filtered",
      currentCategory: category,
      currentPostId: null,
    });

    const state = this.state.getState();
    const filteredPosts = state.posts.filter(
      (post) => post.categories && post.categories.includes(category),
    );

    const postsContainer = document.getElementById("postsContainer");

    // Create a header for the filtered view
    const filterHeaderHTML = `
      <div class="filter-header">
        <h2>Posts in ${category}</h2>
        <button id="clearFilter" class="clear-filter-btn">Show All Posts</button>
      </div>
    `;

    const postsHTML =
      filteredPosts.length > 0
        ? filteredPosts.map((post) => PostUI.createPostHTML(post)).join("")
        : `<article class="post">
          <h2>No posts found</h2>
          <p>There are no posts in the "${category}" category yet.</p>
         </article>`;

    postsContainer.innerHTML = filterHeaderHTML + postsHTML;

    document.getElementById("clearFilter").addEventListener("click", () => {
      this.showFeed();
    });
  }

  showCreatePostForm() {
    const createPostForm = document.getElementById("createPostForm");
    const createPostBtn = document.getElementById("createPostBtn");
    if (createPostForm && createPostBtn) {
      createPostForm.classList.remove("hidden");
      createPostBtn.classList.add("hidden");
    }
  }

  hideCreatePostForm() {
    const createPostForm = document.getElementById("createPostForm");
    const createPostBtn = document.getElementById("createPostBtn");
    const postForm = document.getElementById("postForm");
    if (createPostForm && createPostBtn && postForm) {
      createPostForm.classList.add("hidden");
      createPostBtn.classList.remove("hidden");
      postForm.reset();
      // Reset checkboxes
      document
        .querySelectorAll('input[name="category"]')
        .forEach((checkbox) => {
          checkbox.checked = false;
        });
    }
  }

  async handleCreatePost(e) {
    e.preventDefault();
    const username = this.state.currentUser?.nickname || "Anonymous";
    let title = document.getElementById("postTitle").value;
    let content = document.getElementById("postContent").value;
    let imageInput = document.getElementById("postImage");
    const categories = Array.from(
      document.querySelectorAll('input[name="category"]:checked'),
    ).map((checkbox) => {
      // Capitalize first letter
      const value = checkbox.value;
      return value.charAt(0).toUpperCase() + value.slice(1);
    });

    const state = this.state.getState();
    const createdAt = new Date().toISOString();

    if (!categories.length) {
      this.showError(e.target, "Please select at least one category");
      return;
    }

    // Create a FormData object
    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    formData.append("categories", JSON.stringify(categories)); // Append categories as JSON

    // Append the image file if it exists
    if (imageInput.files.length > 0) {
      formData.append("image", imageInput.files[0]);
    }

    try {
      const response = await fetch("/posts", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to create post");
      }

      const resp = await response.json();
      title = resp.title;
      content = resp.content;
      const postID = resp.id;

      const newPost = {
        id: postID,
        title,
        content,
        categories,
        username: state.currentUser.nickname,
        createdAt,
        likes: 0,
        dislikes: 0,
        likedBy: [],
        imageURL: resp.imageURL || "",
      };

      const posts = [newPost, ...state.posts];
      this.state.setState({ posts });

      // Notify other components that a new post was created
      document.dispatchEvent(new CustomEvent("posts:created"));
      this.hideCreatePostForm();
    } catch (error) {
      console.error("Error creating post:", error);
      this.showError(e.target, "Failed to create post. Please try again.");
    }
  }

  showError(form, message) {
    const errorDiv =
      form.querySelector(".error") || document.createElement("div");
    errorDiv.className = "error";
    errorDiv.textContent = message;
    if (!form.querySelector(".error")) {
      form.appendChild(errorDiv);
    }
  }

  async fetchPosts() {
    try {
      const response = await fetch("/posts", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch posts");
      }

      const data = await response.json();

      if (!data.post) {
        data.post = [];
      }

      const processedPosts = data.post.map((post) => {
        // Ensure Comments array exists
        if (!post.Comments && post.comments) {
          post.Comments = post.comments;
          delete post.comments;
        } else if (!post.Comments) {
          post.Comments = [];
        }

        if (post.Comments && post.Comments.length > 0) {
          post.Comments = post.Comments.map((comment) => ({
            ID: comment.id,
            content: comment.content,
            username: comment.username,
            createdAt: comment.createdAt,
            UserID: comment.user_id,
            likes: comment.likes || 0,
            dislikes: comment.dislikes || 0,
            likedBy: comment.likedBy || [],
            dislikedBy: comment.dislikedBy || [],
          }));
        }
        return post;
      });
      console.log("posts:", processedPosts);
      this.state.setState({ posts: processedPosts });

      document.dispatchEvent(new CustomEvent("posts:updated"));
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  }

  async handleLikePost(postId) {
    const state = this.state.getState();
    if (!state.currentUser) return;

    try {
      const response = await fetch(`/likes?id=${postId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to like post");
      }

      const data = await response.json();

      // Update the UI with new counts from server
      const posts = state.posts.map((post) => {
        if (post.id === postId) {
          post.likes = data.likes;
          post.dislikes = data.dislikes;

          // Update liked status for UI feedback
          if (!post.likedBy) post.likedBy = [];
          if (!post.dislikedBy) post.dislikedBy = [];

          const userLiked = post.likedBy.includes(state.currentUser.nickname);
          console.log("userLiked", userLiked);

          // Toggle like status in UI
          if (userLiked) {
            post.likedBy = post.likedBy.filter(
              (u) => u !== state.currentUser.nickname,
            );
          } else {
            post.likedBy.push(state.currentUser.nickname);
            post.dislikedBy = post.dislikedBy.filter(
              (u) => u !== state.currentUser.nickname,
            );
          }
        }
        return post;
      });

      this.state.setState({ posts });

      // Check current view and update accordingly
      const currentState = this.state.getState();
      if (
        currentState.currentView === "detail" &&
        currentState.currentPostId === postId
      ) {
        this.showPostDetail(postId); // Refresh the detail view
      } else {
        document.dispatchEvent(new CustomEvent("posts:updated"));
      }
      document.dispatchEvent(new CustomEvent("post:liked"));
    } catch (error) {
      console.error("Error liking post:", error);
      console.error("Full error:", error.message, error.stack);
    }
  }

  async handleDislikePost(postId) {
    const state = this.state.getState();
    if (!state.currentUser) return;

    try {
      const response = await fetch(`/dislikes?id=${postId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to dislike post");
      }

      const data = await response.json();

      // Update the UI with new counts from server
      const posts = state.posts.map((post) => {
        if (post.id === postId) {
          post.likes = data.likes;
          post.dislikes = data.dislikes;

          // Update disliked status for UI feedback
          if (!post.likedBy) post.likedBy = [];
          if (!post.dislikedBy) post.dislikedBy = [];

          const userDisliked = post.dislikedBy.includes(
            state.currentUser.nickname,
          );

          // Toggle dislike status in UI
          if (userDisliked) {
            post.dislikedBy = post.dislikedBy.filter(
              (u) => u !== state.currentUser.nickname,
            );
          } else {
            post.dislikedBy.push(state.currentUser.nickname);
            post.likedBy = post.likedBy.filter(
              (u) => u !== state.currentUser.nickname,
            );
          }
        }
        return post;
      });

      this.state.setState({ posts });

      const currentState = this.state.getState();
      if (
        currentState.currentView === "detail" &&
        currentState.currentPostId === postId
      ) {
        this.showPostDetail(postId);
      } else if (
        currentState.currentView === "filtered" &&
        currentState.currentCategory
      ) {
        this.filterPostsByCategory(currentState.currentCategory);
      } else {
        document.dispatchEvent(new CustomEvent("posts:updated"));
      }
    } catch (error) {
      console.error("Error disliking post:", error);
      console.error("Full error:", error.message, error.stack);
    }
  }

  toggleComments(postId) {
    const commentsSection = document.querySelector(
      `.post[data-post-id="${postId}"] .comments-section`,
    );
    if (commentsSection) {
      commentsSection.classList.toggle("hidden");
    }
  }

  async handleAddComment(postId, e) {
    const commentInput = e.target.querySelector(".comment-input");
    const commentText = commentInput.value.trim();
    const state = this.state.getState();

    if (!commentText || !state.currentUser) return;

    try {
      const response = await fetch(`/comments?id=${postId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: commentText }),
      });

      if (!response.ok) {
        throw new Error("Failed to comment on post");
      }

      const data = await response.json();
      console.log("comment: ", data);

      if (data.success && data.comment) {
        const posts = state.posts.map((post) => {
          if (post.id === parseInt(postId)) {
            if (!post.Comments) post.Comments = [];

            post.Comments.push({
              ID: data.comment.id,
              content: data.comment.content,
              username: data.comment.username,
              createdAt: data.comment.createdAt,
              UserID: data.comment.user_id,
              likes: 0,
              dislikes: 0,
              likedBy: [],
              dislikedBy: [],
            });
          }
          return post;
        });

        this.state.setState({ posts });

        const currentState = this.state.getState();
        if (
          currentState.currentView === "detail" &&
          currentState.currentPostId === parseInt(postId)
        ) {
          this.showPostDetail(postId);
        } else if (
          currentState.currentView === "filtered" &&
          currentState.currentCategory
        ) {
          this.filterPostsByCategory(currentState.currentCategory);
        } else {
          document.dispatchEvent(new CustomEvent("posts:updated"));
        }
      }

      commentInput.value = "";
    } catch (error) {
      console.error("Error commenting on post:", error);
    }
  }

  async handleLikeComment(postId, commentId) {
    const state = this.state.getState();
    if (!state.currentUser) return;

    try {
      const response = await fetch(
        `/like-comment?postId=${postId}&commentId=${commentId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to like comment");
      }

      const data = await response.json();

      // Update the UI with new counts from server
      const posts = state.posts.map((post) => {
        if (post.id === postId) {
          if (post.Comments) {
            post.Comments = post.Comments.map((comment) => {
              if (comment.ID === commentId) {
                comment.likes = data.likes;
                comment.dislikes = data.dislikes;

                // Update liked status for UI feedback
                if (!comment.likedBy) comment.likedBy = [];
                if (!comment.dislikedBy) comment.dislikedBy = [];

                const userLiked = comment.likedBy.includes(
                  state.currentUser.nickname,
                );

                // Toggle like status in UI
                if (userLiked) {
                  comment.likedBy = comment.likedBy.filter(
                    (u) => u !== state.currentUser.nickname,
                  );
                } else {
                  comment.likedBy.push(state.currentUser.nickname);
                  comment.dislikedBy = comment.dislikedBy.filter(
                    (u) => u !== state.currentUser.nickname,
                  );
                }
              }
              return comment;
            });
          }
        }
        return post;
      });

      this.state.setState({ posts });

      const currentState = this.state.getState();
      if (
        currentState.currentView === "detail" &&
        currentState.currentPostId === postId
      ) {
        this.showPostDetail(postId);
      } else if (
        currentState.currentView === "filtered" &&
        currentState.currentCategory
      ) {
        this.filterPostsByCategory(currentState.currentCategory);
      } else {
        document.dispatchEvent(new CustomEvent("posts:updated"));
      }
      document.dispatchEvent(new CustomEvent("comment:liked"));
    } catch (error) {
      console.error("Error liking comment:", error);
      console.error("Full error:", error.message, error.stack);
    }
  }

  async handleDislikeComment(postId, commentId) {
    const state = this.state.getState();
    if (!state.currentUser) return;

    try {
      const response = await fetch(
        `/dislike-comment?postId=${postId}&commentId=${commentId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to dislike comment");
      }

      const data = await response.json();

      // Update the UI with new counts from server
      const posts = state.posts.map((post) => {
        if (post.id === postId) {
          if (post.Comments) {
            post.Comments = post.Comments.map((comment) => {
              if (comment.ID === commentId) {
                comment.likes = data.likes;
                comment.dislikes = data.dislikes;

                // Update disliked status for UI feedback
                if (!comment.likedBy) comment.likedBy = [];
                if (!comment.dislikedBy) comment.dislikedBy = [];

                const userDisliked = comment.dislikedBy.includes(
                  state.currentUser.nickname,
                );

                // Toggle dislike status in UI
                if (userDisliked) {
                  comment.dislikedBy = comment.dislikedBy.filter(
                    (u) => u !== state.currentUser.nickname,
                  );
                } else {
                  comment.dislikedBy.push(state.currentUser.nickname);
                  comment.likedBy = comment.likedBy.filter(
                    (u) => u !== state.currentUser.nickname,
                  );
                }
              }
              return comment;
            });
          }
        }
        return post;
      });

      this.state.setState({ posts });

      const currentState = this.state.getState();
      if (
        currentState.currentView === "detail" &&
        currentState.currentPostId === postId
      ) {
        this.showPostDetail(postId);
      } else if (
        currentState.currentView === "filtered" &&
        currentState.currentCategory
      ) {
        this.filterPostsByCategory(currentState.currentCategory);
      } else {
        document.dispatchEvent(new CustomEvent("posts:updated"));
      }
      document.dispatchEvent(new CustomEvent("comment:disliked"));
    } catch (error) {
      console.error("Error disliking comment:", error);
      console.error("Full error:", error.message, error.stack);
    }
  }
}
