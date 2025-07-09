import { AuthUI } from "./components/AuthUI.js";
import { HeaderUI } from "./components/HeaderUI.js";
import { SidebarUI } from "./components/SidebarUI.js";
import { PostUI } from "./components/PostUI.js";
import { NotFoundUI } from "./components/NotFoundUI.js";
import { ChatUI } from "./components/ChatUI.js";
import { PostManager } from "../posts/PostManager.js";

export class UIManager {
  constructor(stateManager) {
    this.state = stateManager;
    this.initialized = false;
    this.bindEvents();
    this.socket = null;
    this.onlineUsers = new Set();
    this.initWebSocket();
    this.fetchInitialUsers();
  }

  bindEvents() {
    // Add logout button event listener
    document.addEventListener("click", (e) => {
      if (e.target.id === "logoutBtn") {
        document.dispatchEvent(new CustomEvent("auth:logout"));
      } else if (
        e.target.id === "myPostsLink" ||
        e.target.closest("#myPostsLink")
      ) {
        e.preventDefault();
        window.history.pushState(null, "", "/my-posts");
        document.dispatchEvent(new CustomEvent("route:my-posts"));
      } else if (
        e.target.id === "myLikesLink" ||
        e.target.closest("#myLikesLink")
      ) {
        e.preventDefault();
        window.history.pushState(null, "", "/my-likes");
        document.dispatchEvent(new CustomEvent("route:my-likes"));
      } else if (
        e.target.tagName === "A" &&
        e.target.getAttribute("href") === "/posts"
      ) {
        e.preventDefault();
        window.history.pushState(null, "", "/posts");
        document.dispatchEvent(new CustomEvent("route:posts"));
      }
    });

    document.addEventListener("post:detail", (e) => {
      this.showPostDetail(e.detail.postId);
    });

    document.addEventListener("post:feed", () => {
      this.showFeed();
    });

    document.addEventListener("post:liked", () => this.updatePersonalCounts());
    document.addEventListener("post:disliked", () =>
      this.updatePersonalCounts()
    );
    document.addEventListener("auth:login", () => this.showDashboard());
    document.addEventListener("auth:logout", () => this.showLogin());
    document.addEventListener("auth:showLogin", () => this.showLogin());
    document.addEventListener("posts:created", () => this.refreshPosts());
    document.addEventListener("posts:updated", () => this.refreshPosts());

    // Route events
    document.addEventListener("route:login", () => this.showLogin());
    document.addEventListener("route:register", () => this.showRegister());
    document.addEventListener("route:dashboard", () => this.showDashboard());
    document.addEventListener("route:posts", () => this.showAllPosts());
    document.addEventListener("route:my-posts", () => this.showMyPosts());
    document.addEventListener("route:my-likes", () => this.showMyLikes());
    document.addEventListener("route:404", () => this.show404());
  }

  renderInitialLayout() {
    const app = document.getElementById("app");
    if (!app) return;

    this.initialized = true;
    app.innerHTML = `
      ${AuthUI.getAuthContainer()}
      <div class="dashboard-container hidden" id="dashboard">
        ${HeaderUI.getHeader()}
        <div class="dashboard-content">
          ${SidebarUI.getLeftSidebar()}
          <main class="main-content">
            ${PostUI.getCreatePostForm()}
            ${PostUI.getPostsContainer()}
          </main>
          ${SidebarUI.getRightSidebar()}
        </div>
      </div>
      <div id="notFoundContainer" class="hidden">
        ${NotFoundUI.get404Page()}
      </div>
      ${ChatUI.getChatOverlay()}
    `;

    this.initializeElements();
    if (!["/login", "/register"].includes(window.location.pathname)) {
      this.fetchInitialUsers();
    }
  }

  fetchInitialUsers() {
    fetch("/render-users")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch users: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data && data.users) {
          localStorage.setItem("users", JSON.stringify(data.users));
          this.updateOnlineUsersList(data.users);
        }
      })
      .catch((error) => {
        console.error("Error fetching initial users:", error);
      });
  }

  initializeElements() {
    // Cache DOM elements after they are created
    this.elements = {
      authContainer: document.getElementById("authContainer"),
      dashboard: document.getElementById("dashboard"),
      signInBtn: document.getElementById("signInBtn"),
      signUpBtn: document.getElementById("signUpBtn"),
      logoutBtn: document.getElementById("logoutBtn"),
      usernameDisplay: document.getElementById("usernameDisplay"),
      createPostBtn: document.getElementById("createPostBtn"),
      onlineUsersList: document.getElementById("onlineUsersList"),
      notFoundContainer: document.getElementById("notFoundContainer"),
      postsContainer: document.getElementById("postsContainer"),
    };
  }

  ensureInitialized() {
    this.renderInitialLayout();
  }

  showDashboard() {
    this.ensureInitialized();

    if (!this.elements) {
      this.initializeElements();
    }

    const state = this.state.getState();

    this.elements.authContainer.classList.add("hidden");
    this.elements.dashboard.classList.remove("hidden");
    this.elements.notFoundContainer.classList.add("hidden");

    if (state.currentUser) {
      this.elements.signInBtn.classList.add("hidden");
      this.elements.signUpBtn.classList.add("hidden");
      this.elements.logoutBtn.classList.remove("hidden");
      this.elements.usernameDisplay.textContent = state.currentUser.nickname;
      this.elements.createPostBtn?.classList.remove("hidden");

      // Update URL if not already on dashboard
      if (window.location.pathname !== "/dashboard") {
        window.history.replaceState(null, "", "/dashboard");
      }
    } else {
      this.elements.signInBtn.classList.remove("hidden");
      this.elements.signUpBtn.classList.remove("hidden");
      this.elements.logoutBtn.classList.add("hidden");
      this.elements.createPostBtn?.classList.add("hidden");
    }

    this.refreshPosts();
    this.initWebSocket();
  }

  showLogin() {
    this.ensureInitialized();

    if (!this.elements) {
      this.initializeElements();
    }

    this.elements.authContainer.classList.remove("hidden");
    this.elements.dashboard.classList.add("hidden");
    this.elements.notFoundContainer.classList.add("hidden");

    // Show login form by default
    const loginBtn = document.getElementById("loginBtn");
    const registerBtn = document.getElementById("registerBtn");
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    if (loginBtn && registerBtn && loginForm && registerForm) {
      loginBtn.classList.add("active");
      registerBtn.classList.remove("active");
      loginForm.classList.remove("hidden");
      registerForm.classList.add("hidden");
    }

    // Update URL if not already on login
    if (window.location.pathname !== "/login") {
      window.history.replaceState(null, "", "/login");
    }
  }

  showRegister() {
    this.ensureInitialized();

    if (!this.elements) {
      this.initializeElements();
    }

    this.elements.authContainer.classList.remove("hidden");
    this.elements.dashboard.classList.add("hidden");
    this.elements.notFoundContainer.classList.add("hidden");

    // Show register form
    const loginBtn = document.getElementById("loginBtn");
    const registerBtn = document.getElementById("registerBtn");
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    if (loginBtn && registerBtn && loginForm && registerForm) {
      registerBtn.classList.add("active");
      loginBtn.classList.remove("active");
      registerForm.classList.remove("hidden");
      loginForm.classList.add("hidden");
    }

    // Update URL if not already on register
    if (window.location.pathname !== "/register") {
      window.history.replaceState(null, "", "/register");
    }
  }

  show404() {
    this.ensureInitialized();

    if (!this.elements) {
      this.initializeElements();
    }

    this.elements.authContainer.classList.add("hidden");
    this.elements.dashboard.classList.add("hidden");
    this.elements.notFoundContainer.classList.remove("hidden");
  }

  
initWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/users`;

  this.socket = new WebSocket(wsUrl);

  this.socket.addEventListener("open", (event) => {
    console.log("WebSocket connection established for online users.", event);
  });

  this.socket.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === "user_update") {
        this.updateOnlineUsersList(data.users);
      }
    } catch (error) {
      console.error("Error processing WebSocket message:", error);
      console.error("Received data:", event.data);
    }
  });

  this.socket.addEventListener("close", () => {
    console.warn("WebSocket disconnected. Attempting to reconnect...");
    // Add reconnection logic here if needed
  });

  this.socket.addEventListener("error", (error) => {
    console.error("WebSocket error:", error);
  });
}

  updateOnlineUsersList(users) {
    const onlineUsersList = document.getElementById("onlineUsersList");
    const currentUser = this.state.getState().currentUser.nickname;
  
    users.forEach((user) => {
      if (user.username === currentUser) return; // Skip current user
  
      const existingUser = onlineUsersList.querySelector(
        `li[data-username="${user.username}"]`
      );
  
      if (existingUser) {
        // Update user status dynamically
        const statusIndicator = existingUser.querySelector(".online-indicator");

        existingUser.classList.toggle("online", user.online);
        existingUser.classList.toggle("offline", !user.online);
        statusIndicator.classList.toggle("active", user.online);
      } else {
        // Add new users with improved structure
        const li = document.createElement("li");
        li.className = `online-user user-item ${
          user.online ? "online" : "offline"
        }`;
        li.dataset.username = user.username;
        
        li.innerHTML = `
          <div class="user-info">
              <span class="online-indicator ${user.online ? "active" : ""}"></span>
              <span class="name">${user.username}</span>
          </div>
          <span class="message-notification"></span>
        `;
        
        onlineUsersList.appendChild(li);
        this.onlineUsers.add(user.username);
      }
    });
  }

  refreshPosts() {
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
    this.updatePersonalCounts();
  }

  updatePersonalCounts() {
    const state = this.state.getState();
    if (!state.currentUser) return;

    const userPosts = state.posts.filter(
      (post) => post.username === state.currentUser.nickname
    );
    const userLikes = state.posts.filter((post) =>
      post.likedBy?.includes(state.currentUser.nickname)
    );
    // console.log("user likes: ", userLikes)

    document.getElementById("myPostsCount").textContent = userPosts.length;
    document.getElementById("myLikesCount").textContent = userLikes.length;
    // console.log("my likes", userLikes.length)
  }

  showPostDetail(postId) {
    const state = this.state.getState();
    const post = state.posts.find((post) => post.id === parseInt(postId));
    if (post) {
      const postsContainer = document.getElementById("postsContainer");
      postsContainer.innerHTML = PostUI.getPostDetailView(post);
    }
  }

  showFeed() {
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

  showAllPosts() {
    this.showDashboard();
    this.refreshPosts();
  }

  showMyPosts() {
    this.showDashboard();

    const state = this.state.getState();
    if (!state.currentUser) return;

    const userPosts = state.posts.filter(
      (post) => post.username === state.currentUser.nickname
    );
    this.elements.postsContainer.innerHTML =
      userPosts.length > 0
        ? userPosts.map((post) => PostUI.createPostHTML(post)).join("")
        : `<article class="post">
          <h2>No Posts Yet</h2>
          <p>You haven't created any posts yet. Why not create your first post?</p>
         </article>`;
  }

  showMyLikes() {
    this.showDashboard();

    const state = this.state.getState();
    if (!state.currentUser) return;

    const likedPosts = state.posts.filter((post) =>
      post.likedBy?.includes(state.currentUser.nickname)
    );
    this.elements.postsContainer.innerHTML =
      likedPosts.length > 0
        ? likedPosts.map((post) => PostUI.createPostHTML(post)).join("")
        : `<article class="post">
          <h2>No Liked Posts</h2>
          <p>You haven't liked any posts yet. Browse through posts and like the ones you enjoy!</p>
         </article>`;
  }
}