export class ChatUI {
  static getChatOverlay() {
    return `
      <div id="chatOverlay" class="chat-overlay hidden">
        <div class="chat-container">
          <div class="chat-header">
            <h3 id="chatRecipient">Chat with User</h3>
            <button type="button" id="closeChatBtn" class="close-chat-btn" aria-label="Close chat">×</button>
          </div>
          <div id="chatMessages" class="chat-messages">
            <!-- Messages will be populated here -->
          </div>
          <div id="typingIndicator" class="typing-indicator hidden"></div>
          <form id="chatForm" class="chat-form">
            <input type="text" id="chatInput" placeholder="Type a message..." required>
            <button type="submit">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </form>
        </div>
      </div>
    `;
  }

  static createMessageHTML(message, isOwn = false) {
    return `
      <div class="message ${isOwn ? 'own-message' : 'other-message'}">
        <div class="message-content">
          <p>${message.content}</p>
          <div class="msg-info">
            <span class="sender">${message.sender}</span>
            <span class="message-time">${timeAgo(message.timestamp)}</span>
          </div>
        </div>
      </div>
    `;
  }
}

function timeAgo(timestamp) {
  const date = new Date(timestamp);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const day = String(date.getDate()).padStart(2, '0');

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}