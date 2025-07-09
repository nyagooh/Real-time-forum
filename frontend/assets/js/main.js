import { AuthManager } from './auth/AuthManager.js';
import { UIManager } from './ui/UIManager.js';
import { PostManager } from './posts/PostManager.js';
import { ThemeManager } from './theme/ThemeManager.js';
import { StateManager } from './state/StateManager.js';
import { Router } from './router/Router.js';
import { ChatManager } from './chat/ChatManager.js';

class ForumApp {
  constructor() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  init() {
    this.state = new StateManager();
    this.ui = new UIManager(this.state);
    this.auth = new AuthManager(this.state);
    this.posts = new PostManager(this.state);
    this.theme = new ThemeManager();
    this.router = new Router(this.state);
    // Pass the UIManager instance to ChatManager
    this.chat = new ChatManager(this.state, this.ui);

    // Initialize application
    this.initialize();
  }

  initialize() {
    this.ui.renderInitialLayout();
    this.theme.initializeTheme();
    // Fetch initial posts
    document.dispatchEvent(new CustomEvent('posts:fetch'));
    // Check login status after everything is initialized
    this.auth.checkLoginStatus();
  }
}

// Initialize the application
new ForumApp();