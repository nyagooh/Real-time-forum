export class Router {
  constructor(stateManager) {
    this.state = stateManager;
    this.publicRoutes = ['/login', '/register']; // Routes that don't require auth
    this.routes = {
      '/': this.handleHome.bind(this),
      '/login': this.handleLogin.bind(this),
      '/register': this.handleRegister.bind(this),
      '/dashboard': this.handleDashboard.bind(this),
      '/posts': this.handlePosts.bind(this),
      '/my-posts': this.handleMyPosts.bind(this),
      '/my-likes': this.handleMyLikes.bind(this)
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  init() {
    this.handleRoute();
    window.addEventListener('popstate', () => this.handleRoute());
    document.addEventListener('click', (e) => {
      if (e.target.matches('a[href^="/"]')) {
        e.preventDefault();
        this.navigate(e.target.getAttribute('href'));
      }
    });
  }

  navigate(path) {
    window.history.pushState(null, '', path);
    this.handleRoute();
  }

  handleRoute() {
    const path = window.location.pathname;
    const state = this.state.getState();
    
    // If user is not logged in and trying to access protected route
    if (!state.currentUser && !this.publicRoutes.includes(path)) {
      this.navigate('/login');
      return;
    }

    // If user is logged in and trying to access login/register
    if (state.currentUser && this.publicRoutes.includes(path)) {
      this.navigate('/dashboard');
      return;
    }

    const handler = this.routes[path] || this.handle404;
    handler();
  }

  handleHome() {
    const state = this.state.getState();
    if (state.currentUser) {
      this.navigate('/dashboard');
    } else {
      this.navigate('/login');
    }
  }

  handleLogin() {
    document.dispatchEvent(new CustomEvent('route:login'));
  }

  handleRegister() {
    document.dispatchEvent(new CustomEvent('route:register'));
  }

  handleDashboard() {
    const state = this.state.getState();
    if (!state.currentUser) {
      this.navigate('/login');
      return;
    }
    document.dispatchEvent(new CustomEvent('route:dashboard'));
  }

  handlePosts() {
    const state = this.state.getState();
    if (!state.currentUser) {
      this.navigate('/login');
      return;
    }
    document.dispatchEvent(new CustomEvent('route:posts'));
  }

  handleMyPosts() {
    const state = this.state.getState();
    if (!state.currentUser) {
      this.navigate('/login');
      return;
    }
    document.dispatchEvent(new CustomEvent('route:my-posts'));
  }

  handleMyLikes() {
    const state = this.state.getState();
    if (!state.currentUser) {
      this.navigate('/login');
      return;
    }
    document.dispatchEvent(new CustomEvent('route:my-likes'));
  }

  handle404() {
    document.dispatchEvent(new CustomEvent('route:404'));
  }
}