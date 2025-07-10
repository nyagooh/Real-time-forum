export class NotFoundUI {
  static get404Page() {
    return `
      <div class="not-found-container">
        <div class="not-found-content">
          <h1>404</h1>
          <h2>Page Not Found</h2>
          <p>Oops! The page you're looking for doesn't exist.</p>
          <a href="/" class="home-link">Go Home</a>
        </div>
      </div>
    `;
  }
}