export class AuthManager {
  constructor(stateManager) {
    this.state = stateManager;
    this.bindEvents();
    this.hasFetchedPosts = false;
  }

  bindEvents() {
    document.addEventListener('auth:logout', () => {
      this.handleLogout();
    });

    document.addEventListener('submit', (e) => {
      if (e.target.id === 'loginForm') {
        e.preventDefault();
        this.handleLogin(e);
      } else if (e.target.id === 'registerForm') {
        e.preventDefault();
        this.handleRegister(e);
      }
    });

    // Add event listeners for toggle buttons
    document.addEventListener('click', (e) => {
      if (e.target.id === 'loginBtn') {
        e.preventDefault();
        this.showLoginForm();
      } else if (e.target.id === 'registerBtn') {
        e.preventDefault();
        this.showRegisterForm();
      } else if (e.target.id === 'signInBtn') {
        e.preventDefault();
        window.history.pushState(null, '', '/login');
        document.dispatchEvent(new CustomEvent('route:login'));
      } else if (e.target.id === 'signUpBtn') {
        e.preventDefault();
        window.history.pushState(null, '', '/register');
        document.dispatchEvent(new CustomEvent('route:register'));
      }
    });
  }

  showLoginForm() {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    loginBtn.classList.add('active');
    registerBtn.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');

    window.history.replaceState(null, '', '/login');
  }

  showRegisterForm() {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    registerBtn.classList.add('active');
    loginBtn.classList.remove('active');
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');

    window.history.replaceState(null, '', '/register');
  }

  async handleLogin(e) {
    e.preventDefault();
    const identity = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ identity, password })
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      this.state.setState({ currentUser: data.user });
      document.dispatchEvent(new CustomEvent('auth:login'));
      this.clearForm(e.target);

      window.history.pushState(null, '', '/dashboard');
      document.dispatchEvent(new CustomEvent('route:dashboard'));

      if (!this.hasFetchedPosts) {
        document.dispatchEvent(new CustomEvent('posts:fetch'));
        hasFetchedPosts = true;
      }
    } catch (error) {
      this.showError(e.target, 'Invalid username or password');
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    const nickname = document.getElementById('registerUsername').value;
    const age = document.getElementById('registerAge').value;
    const gender = document.getElementById('registerGender').value;
    const firstname = document.getElementById('registerFirstname').value;
    const lastname = document.getElementById('registerLastname').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    const userData = {
      nickname,
      age,
      gender,
      firstname,
      lastname,
      email,
      password
    };

    if (password !== confirmPassword) {
      this.showError(e.target, 'Passwords do not match');
      return;
    }

    try {
      const response = await fetch('/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      this.clearForm(e.target);
      this.showSuccess(e.target, 'Registration successful! Please login.');
      setTimeout(() => {
        window.history.pushState(null, '', '/login');
        document.dispatchEvent(new CustomEvent('auth:showLogin'));
      }, 1000);
    } catch (error) {
      this.showError(e.target, error.message);
    }
  }

  handleLogout() {
    try {
      const response = fetch('/logout', {
        method: 'POST'
      });

      if (response.ok) {
        throw new Error('Failed to logout');
      }
    } catch (error) {
      console.error('Failed to logout', error);
    }

    localStorage.removeItem('currentUser');
    this.state.setState({ currentUser: null });
    document.dispatchEvent(new CustomEvent('auth:logout'));
    window.location.href = '/login'; 
    window.history.pushState(null, '', '/login');
  }

  async checkLoginStatus() {
    try {
      const response = await fetch('/auth/status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
      });

      if (!response.ok) {
      throw new Error('Failed to fetch login status');
      }

      const data = await response.json();

      if (data.isLoggedIn) {
      this.state.setState({ currentUser: data.user });
      if (window.location.pathname === '/login' || window.location.pathname === '/register' || window.location.pathname === '/') {
        window.history.replaceState(null, '', '/dashboard');
      }
      document.dispatchEvent(new CustomEvent('auth:login'));
      } else {
      this.state.setState({ currentUser: null });
      const path = window.location.pathname;
      if (path !== '/login' && path !== '/register') {
        window.history.replaceState(null, '', '/login');
      }
      document.dispatchEvent(new CustomEvent('auth:showLogin'));
      }
    } catch (error) {
      console.error('Error checking login status:', error);
      this.state.setState({ currentUser: null });
      window.history.replaceState(null, '', '/login');
      document.dispatchEvent(new CustomEvent('auth:showLogin'));
    }
  }

  showError(form, message) {
    const errorDiv = form.querySelector('.error') || document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    if (!form.querySelector('.error')) {
      form.appendChild(errorDiv);
    }
  }

  showSuccess(form, message) {
    const successDiv = form.querySelector('.success') || document.createElement('div');
    successDiv.className = 'success';
    successDiv.textContent = message;
    if (!form.querySelector('.success')) {
      form.appendChild(successDiv);
    }
  }

  clearForm(form) {
    form.reset();
    const errorDiv = form.querySelector('.error');
    const successDiv = form.querySelector('.success');
    if (errorDiv) errorDiv.remove();
    if (successDiv) successDiv.remove();
  }
}