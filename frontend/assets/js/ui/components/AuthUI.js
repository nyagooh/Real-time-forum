export class AuthUI {
  static getLoginForm() {
    return `
      <form id="loginForm" class="form">
        <h2>Login</h2>
        <div class="form-group">
          <label for="loginUsername">Username or Email</label>
          <input type="text" id="loginUsername" required>
        </div>
        <div class="form-group">
          <label for="loginPassword">Password</label>
          <input type="password" id="loginPassword" required>
        </div>
        <button type="submit">Login</button>
      </form>
    `;
  }

  static getRegisterForm() {
    return `
      <form id="registerForm" class="form hidden">
        <h2>Register</h2>
        <div class="form-group">
          <label for="registerUsername">Nickname</label>
          <input type="text" id="registerUsername" required>
        </div>
        <div class="form-group">
          <label for="registerAge">Age</label>
          <input type="number" id="registerAge" required>
        </div>
        <div class="form-group">
          <label for="registerGender">Gender</label>
          <select id="registerGender" required>
            <option value="">Select your gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div class="form-group">
          <label for="registerFirstname">Firstname</label>
          <input type="text" id="registerFirstname" required>
        </div>
        <div class="form-group">
          <label for="registerLastname">Lastname</label>
          <input type="text" id="registerLastname" required>
        </div>
        <div class="form-group">
          <label for="registerEmail">Email</label>
          <input type="email" id="registerEmail" required>
        </div>
        <div class="form-group">
          <label for="registerPassword">Password</label>
          <input type="password" id="registerPassword" required>
        </div>
        <div class="form-group">
          <label for="confirmPassword">Confirm Password</label>
          <input type="password" id="confirmPassword" required>
        </div>
        <button type="submit">Register</button>
      </form>
    `;
  }

  static getAuthContainer() {
    return `
      <div class="auth-container hidden" id="authContainer">
        <header>
          <h1>Forum Account</h1>
          <nav class="auth-nav">
            <button id="loginBtn" class="active">Login</button>
            <button id="registerBtn">Register</button>
          </nav>
        </header>
        <main>
          ${this.getLoginForm()}
          ${this.getRegisterForm()}
        </main>
      </div>
    `;
  }
}