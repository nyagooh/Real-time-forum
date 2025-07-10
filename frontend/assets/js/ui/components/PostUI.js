export class PostUI {
  static getCreatePostForm() {
    return `
      <div class="content-wrapper">
        <div class="create-post-container">
          <button id="createPostBtn" class="create-post-btn hidden">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Create New Post
          </button>
        </div>

        <div id="createPostForm" class="create-post-form hidden">
          <h3>Create New Post</h3>
          <form id="postForm">
            <div class="form-group">
              <label for="postTitle">Title</label>
              <input type="text" id="postTitle" required>
            </div>
            <div class="form-group">
              <label for="postContent">Content</label>
              <textarea id="postContent" required></textarea>
            </div>
            <div class="form-group">
                <label for="image">Upload Image:</label>
                <input type="file" id="postImage" name="image" accept="image/*">
            </div>
            <div class="form-group">
              <label class="categories-label">Categories</label>
              <div class="categories-grid">
                <label class="category-checkbox">
                  <input type="checkbox" name="category" value="tech">
                  <span class="checkbox-label">Tech</span>
                </label>
                <label class="category-checkbox">
                  <input type="checkbox" name="category" value="design">
                  <span class="checkbox-label">Design</span>
                </label>
                <label class="category-checkbox">
                  <input type="checkbox" name="category" value="marketing">
                  <span class="checkbox-label">Marketing</span>
                </label>
                <label class="category-checkbox">
                  <input type="checkbox" name="category" value="development">
                  <span class="checkbox-label">Development</span>
                </label>
                <label class="category-checkbox">
                  <input type="checkbox" name="category" value="science">
                  <span class="checkbox-label">Science</span>
                </label>
                <label class="category-checkbox">
                  <input type="checkbox" name="category" value="health">
                  <span class="checkbox-label">Health</span>
                </label>
                <label class="category-checkbox">
                  <input type="checkbox" name="category" value="education">
                  <span class="checkbox-label">Education</span>
                </label>
                <label class="category-checkbox">
                  <input type="checkbox" name="category" value="business">
                  <span class="checkbox-label">Business</span>
                </label>
                <label class="category-checkbox">
                  <input type="checkbox" name="category" value="lifestyle">
                  <span class="checkbox-label">Lifestyle</span>
                </label>
                <label class="category-checkbox">
                  <input type="checkbox" name="category" value="entertainment">
                  <span class="checkbox-label">Entertainment</span>
                </label>
              </div>
            </div>
            <div class="post-form-actions">
              <button type="submit" class="submit-post">Post</button>
              <button type="button" class="cancel-post" id="cancelPost">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  static createPostHTML(post, showComments = false) {
    const state = window.forumApp?.state?.getState() || { currentUser: null };
    const currentUser = state.currentUser;

    const categoriesHTML = post.categories
      ? `<div class="post-categories">
          ${post.categories.map(category => `
            <span class="category-tag">${category}</span>
          `).join('')}
        </div>`
      : '';

    const userLiked = post.likedBy?.includes(currentUser?.username);
    const userDisliked = post.dislikedBy?.includes(currentUser?.username);

    const comments = post.Comments || [];

    const commentsHTML = comments.map(comment => `
      <div class="comment" data-comment-id="${comment.ID}">
        <div class="comment-content">
          <p>${comment.content}</p>
          <div class="comment-meta">
            <span class="comment-author">Posted by ${comment.username}</span>
            <span class="comment-time">${new Date(comment.createdAt).toLocaleString()}</span>
          </div>
        </div>
        <div class="comment-reactions">
          <div class="reaction-button">
            <button class="like-btn ${comment.likedBy?.includes(currentUser?.username) ? 'active' : ''}" title="Like">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2"/>
              </svg>
              <span>${comment.likes || 0}</span>
            </button>
          </div>
          <div class="reaction-button">
            <button class="dislike-btn ${comment.dislikedBy?.includes(currentUser?.username) ? 'active' : ''}" title="Dislike">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M23 3h-4v12h4V3zM1 14c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.58-6.59c.37-.36.59-.86.59-1.41V5c0-1.1-.9-2-2-2H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2"/>
              </svg>
              <span>${comment.dislikes || 0}</span>
            </button>
          </div>
        </div>
      </div>
    `).join('');

    return `
      <article class="post" data-post-id="${post.id}">
        <h2>${post.title}</h2>
        ${categoriesHTML}
        <p>${post.content}</p>
        ${post.imageURL ? `<div class="post-image"><img src="${post.imageURL.replace('frontend/', '/')}" alt="Post Image" loading="lazy"></div>` : ''}
        <small class="post-meta">Posted by ${post.username} on ${new Date(post.createdAt).toLocaleDateString()}</small>
        <div class="post-actions">
          <button class="like-btn ${userLiked ? 'active' : ''}" title="Like">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2"/>
            </svg>
            <span>${post.likes || 0}</span>
          </button>
          <button class="dislike-btn ${userDisliked ? 'active' : ''}" title="Dislike">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M23 3h-4v12h4V3zM1 14c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.58-6.59c.37-.36.59-.86.59-1.41V5c0-1.1-.9-2-2-2H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2"/>
            </svg>
            <span>${post.dislikes || 0}</span>
          </button>
          <button class="comment-toggle" title="Comments">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"/>
            </svg>
            <span>${comments.length}</span>
          </button>
        </div>
        <div class="comments-section ${showComments ? '' : 'hidden'}">
          <div class="comments-list">
            ${commentsHTML}
          </div>
          <form class="comment-form">
            <input type="text" class="comment-input" placeholder="Write a comment..." required>
            <button type="submit" class="submit-comment">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </form>
        </div>
      </article>
    `;
  }

  static getPostsContainer() {
    return `
      <div class="content-wrapper">
        <div id="postsContainer">
          <!-- Posts will be dynamically inserted here -->
        </div>
      </div>
    `;
  }

  static getPostDetailView(post) {
    return `
      <div class="post-detail">
        <button id="backToFeed">Back to Feed</button>
        ${this.createPostHTML(post, true)} <!-- Pass true to show comments -->
      </div>
    `;
  }
}