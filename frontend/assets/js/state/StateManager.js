  export class StateManager {
  constructor() {
    const defaultChats = {};
    
    this.state = {
      users: JSON.parse(localStorage.getItem('users')) || [],
      currentUser: JSON.parse(localStorage.getItem('currentUser')) || null,
      posts: JSON.parse(localStorage.getItem('posts')) || [],
      userPosts: [],
      userLikes: [],
      darkTheme: localStorage.getItem('theme') !== 'light',
      chats: JSON.parse(localStorage.getItem('chats')) || defaultChats,
      currentView: 'feed',
      currentCategory: null,
      currentPostId: null 
    };
  }

  getState() {
    return this.state;
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.persistState();
  }

  persistState() {
    localStorage.setItem('users', JSON.stringify(this.state.users));
    localStorage.setItem('currentUser', JSON.stringify(this.state.currentUser));
    localStorage.setItem('posts', JSON.stringify(this.state.posts));
    localStorage.setItem('theme', this.state.darkTheme ? 'dark' : 'light');
  }
}