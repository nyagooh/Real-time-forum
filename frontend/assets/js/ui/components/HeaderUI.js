export class HeaderUI {
  static getHeader() {
    return `
      <header class="main-header">
        <a href="/"><div class="logo">Forum</div></a>
        <div class="user-section">
          <button id="themeToggle" class="theme-toggle">
            <!-- Theme toggle icon will be inserted by JS -->
          </button>
          <span id="usernameDisplay" class="username"></span>
          <button id="logoutBtn" class="hidden">Logout</button>
        </div>
        <div class="auth-buttons">
          <button id="signInBtn">Sign in</button>
          <button id="signUpBtn">Sign up</button>
        </div>
      </header>
    `;
  }
}