export class ThemeManager {
  constructor() {
    this.bindEvents();
  }

  bindEvents() {
    document.addEventListener('click', (e) => {
      if (e.target.id === 'themeToggle' || e.target.closest('#themeToggle')) {
        this.toggleTheme();
      }
    });
  }

  initializeTheme() {
    const isDark = localStorage.getItem('theme') !== 'light';
    this.applyTheme(isDark);
  }

  toggleTheme() {
    const isDark = localStorage.getItem('theme') !== 'light';
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
    this.applyTheme(!isDark);
  }

  applyTheme(isDark) {
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
    this.updateThemeButton(isDark);
  }

  updateThemeButton(isDark) {
    const button = document.getElementById('themeToggle');
    if (!button) return;

    button.innerHTML = isDark
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" stroke-width="2" stroke-linecap="round"/>
         </svg>
         Dark`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="5" stroke-width="2"/>
          <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke-width="2" stroke-linecap="round"/>
         </svg>
         Light`;
  }
}