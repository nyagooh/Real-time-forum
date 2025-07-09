import { ChatUI } from "../ui/components/ChatUI.js";

export class ChatManager {
  constructor(stateManager, uiManager) {
    this.state = stateManager;
    this.uiManager = uiManager; // Store the UIManager instance
    this.activeChat = localStorage.getItem("activeChat");
    this.bindEvents();
    this.socket = null;
    this.initWebSocket();
    this.initializeChat();
    this.loadedMessages = [];
    this.isLoading = false;
    this.initialLoadDone = false;
    this.scrollHandler = this.throttle(this.handleScroll.bind(this), 300);
    this.unreadMessages = JSON.parse(localStorage.getItem("unreadMessages")) || {};
    this.isTyping = false;
    this.typingTimeout = null;
    this.typingUsers = new Set();
  }

  initializeChat() {
    if (this.activeChat) {
      setTimeout(() => {
        this.openChat(this.activeChat);
      }, 100);
    }
  }

  retryWebSocketSend(message, retries = 3, delay = 1000) {
    if (retries === 0) {
      console.error("Failed to send message after multiple attempts.");
      alert("Failed to send message. Please try again later.");
      return;
    }

    setTimeout(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(message));
        console.log("Message sent after retry.");
        // Dispatch event when message is sent after retry
        document.dispatchEvent(new CustomEvent('message:sent'));
      } else {
        console.error("WebSocket is still not open. Retrying...");
        this.retryWebSocketSend(message, retries - 1, delay);
      }
    }, delay);
  }

  bindEvents() {
    document.addEventListener("click", (e) => {
      // Handle clicking on online user
      if (e.target.closest(".online-user")) {
        const username = e.target.closest(".online-user").dataset.username;
        this.openChat(username);
      }

      // Handle clicking outside chat container
      if (e.target.id === "chatOverlay") {
        this.closeChat();
      }

      // Handle close chat button
      if (e.target.id === "closeChatBtn" || e.target.closest("#closeChatBtn")) {
        e.preventDefault();
        e.stopPropagation();
        this.closeChat();
      }
    });

    // Handle chat form submission
    document.addEventListener("submit", (e) => {
      if (e.target.id === "chatForm") {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Handle escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.activeChat) {
        this.closeChat();
      }
    });

    // Handle typing status
    document.addEventListener("input", (e) => {
      if (e.target.id === "chatInput" && this.activeChat) {
        this.handleTypingStatus();
      }
    });
  }

  // New method to handle typing status
  handleTypingStatus() {
    if (!this.isTyping) {
      this.isTyping = true;
      this.sendTypingStatus(true);
    }

    // Clear the previous timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Set a new timeout to stop typing after 2 seconds of inactivity
    this.typingTimeout = setTimeout(() => {
      this.isTyping = false;
      this.sendTypingStatus(false);
    }, 2000);
  }

  // Send typing status through websocket
  sendTypingStatus(isTyping) {
    const state = this.state.getState();
    const currentUser = state.currentUser?.nickname;

    if (!currentUser || !this.activeChat) {
      return;
    }

    const typingMessage = {
      type: "typing",
      sender: currentUser,
      receiver: this.activeChat,
      isTyping: isTyping
    };

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(typingMessage));
    } else {
      console.error("WebSocket is not open. Cannot send typing status.");
    }
  }

  initWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    this.socket = new WebSocket(wsUrl);

    this.socket.addEventListener("open", (event) => {
      // WebSocket connection established
      console.log("WebSocket is open now.", event);
    });

    this.socket.onmessage = (event) => {
      try {
        // Split the data by looking for JSON object boundaries
        const rawData = event.data;
        
        // Try to split multiple JSON objects if they're concatenated
        const parsedMessages = this.parseMultipleJsonMessages(rawData);
        
        if (parsedMessages.length > 0) {
          // Process each parsed message
          parsedMessages.forEach(message => {
            this.handleIncomingMessage(message);
          });
          
          // Update users list if needed
          if (this.uiManager) {
            this.uiManager.fetchInitialUsers();
          }
        }
      } catch (error) {
        console.error("Error processing message:", error);
        console.error("Received data:", event.data);
      }
    };

    this.socket.addEventListener("close", (event) => {
      console.log("WebSocket is closed now.", event);
    });

    this.socket.addEventListener("error", (event) => {
      console.error("WebSocket error observed:", event);
    });
  }

  parseMultipleJsonMessages(rawData) {
    const results = [];
    let startPos = 0;
    let depth = 0;
    let inString = false;
    let escaped = false;
    
    // Scan through the raw data character by character
    for (let i = 0; i < rawData.length; i++) {
      const char = rawData[i];
      
      // Handle string detection
      if (char === '"' && !escaped) {
        inString = !inString;
      }
      
      // Track escape characters in strings
      if (inString && char === '\\' && !escaped) {
        escaped = true;
      } else {
        escaped = false;
      }
      
      // Only count braces when not in a string
      if (!inString) {
        if (char === '{') {
          depth++;
        } else if (char === '}') {
          depth--;
          
          // When we reach the end of a JSON object, parse it
          if (depth === 0) {
            try {
              const jsonStr = rawData.substring(startPos, i + 1);
              const parsedObj = JSON.parse(jsonStr);
              results.push(parsedObj);
              
              // Set the start position for the next JSON object
              startPos = i + 1;
            } catch (err) {
              console.error("Failed to parse JSON object:", err);
            }
          }
        }
      }
    }
    
    return results;
  }

  handleIncomingMessage(message) {
    // Handle typing status messages
    if (message.type === "typing") {
      this.handleTypingNotification(message);
      return;
    }

    this.addMessageToUI(message, false);

    // Update user interaction to move the user to the top of the list
    this.updateUserInteraction(message.sender);
    this.updateRecieverSide(message.receiver);

    // Only add notification if this is not the active chat
    if (this.activeChat !== message.sender) {
      this.addNotificationToUser(message.sender);
    }
  }

  // Handle incoming typing notifications
  handleTypingNotification(message) {
    if (message.isTyping) {
      // Add user to typing users set
      this.typingUsers.add(message.sender);
    } else {
      // Remove user from typing users set
      this.typingUsers.delete(message.sender);
    }

    // Update typing indicator in UI
    this.updateTypingIndicator(message.sender);
  }

  // Update typing indicator in UI
  updateTypingIndicator(user) {
    const typingIndicator = document.getElementById("typingIndicator");

    const userElement = document.querySelector(`li[data-username="${user}"]`);

    if (!typingIndicator) return;

    if (this.typingUsers.size > 0) {
      // Check if the current active chat user is typing
      if (this.typingUsers.has(user)) {
        if (!this.activeChat) {
          typingIndicator.classList.add("hidden");
        }
        typingIndicator.textContent = `${user} is typing...`;
        typingIndicator.classList.remove("hidden");

        // Add typing text to the user element in the list
        if (userElement) {
          const typingText = userElement.querySelector(".typing-text");
          if (!typingText) {
            const span = document.createElement("span");
            span.className = "typing-text";
            span.textContent = " typing...";
            span.style.fontSize = "0.8em";
            userElement.appendChild(span);
          }
        }
      } else {
        typingIndicator.classList.add("hidden");

        // Remove typing text from the user element in the list
        if (userElement) {
          const typingText = userElement.querySelector(".typing-text");
          if (typingText) {
            typingText.remove();
          }
        }
      }
    } else {
      typingIndicator.classList.add("hidden");

      // Remove typing text from the user element in the list
      if (userElement) {
        const typingText = userElement.querySelector(".typing-text");
        if (typingText) {
          typingText.remove();
        }
      }
    }
  }

  addNotificationToUser(username) {
    const userLi = document.querySelector(`li[data-username="${username}"]`);
    if (userLi) {
      let notification = userLi.querySelector(".message-notification");

      if (!notification) {
        console.error("Notification element not found!");
        return;
      }

      // Initialize or increment unread message count
      if (!this.unreadMessages[username]) {
        this.unreadMessages[username] = 0;
      }
      this.unreadMessages[username]++;
      
      // Save to local storage
      localStorage.setItem("unreadMessages", JSON.stringify(this.unreadMessages));

      // Update notification UI with classList instead of inline styles
      notification.classList.add("active");
      notification.textContent = this.unreadMessages[username];
    }
  }

  updateUserInteraction(receiverUsername) {
    const usersJSON = localStorage.getItem('users');
    if (!usersJSON) return;
  
    let usersList = JSON.parse(usersJSON);
  
    const index = usersList.findIndex(user => user.username === receiverUsername);
    if (index === -1) return;
  
    const [user] = usersList.splice(index, 1);
    usersList.unshift(user);
  
    localStorage.setItem('users', JSON.stringify(usersList));
  
    this.updateOnlineUsersList(usersList);
  }

  updateOnlineUsersList(users) {
    const onlineUsersList = document.getElementById("onlineUsersList");
    const currentUser = this.state.getState().currentUser?.nickname;

    if (!onlineUsersList || !currentUser) return;

    // Clear the initial list
    onlineUsersList.innerHTML = "";

    users.forEach((user) => {
      if (user.username === currentUser) return;

      const li = document.createElement("li");
      li.className = `online-user user-item ${
        user.online ? "online" : "offline"
      }`;
      li.dataset.username = user.username;
      
      // Add notification badge with count if there are unread messages
      const notificationCount = this.unreadMessages[user.username] || 0;
      
      li.innerHTML = `
          <div class="user-info">
              <span class="online-indicator ${user.online ? "active" : ""}"></span>
              <span class="name">${user.username}</span>
          </div>
          <span class="message-notification ${notificationCount > 0 ? 'active' : ''}">${notificationCount || ''}</span>
      `;
      onlineUsersList.appendChild(li);
    });
  }

  openChat(username) {
    this.activeChat = username;
    localStorage.setItem("activeChat", username);

    // Clear notification for this user
    this.clearNotification(username);

    // Update UI
    const chatOverlay = document.getElementById("chatOverlay");
    const chatRecipient = document.getElementById("chatRecipient");
    const chatMessages = document.getElementById("chatMessages");

    if (chatOverlay && chatRecipient && chatMessages) {
      // Clear previous messages first
      this.loadedMessages = [];
      this.initialLoadDone = false;
      chatMessages.innerHTML = '';
      
      chatOverlay.classList.remove("hidden");
      chatOverlay.style.display = "flex";
      chatRecipient.textContent = `Chat with ${username}`;

      // Load existing messages or show welcome message
      this.loadMessages(username);

      // Focus the input field
      setTimeout(() => {
        document.getElementById("chatInput")?.focus();
      }, 100);

      // Attach scroll listener
      this.initScrollListener();
    }
  }

  clearNotification(username) {
    // Reset unread message count
    if (this.unreadMessages[username]) {
      this.unreadMessages[username] = 0;
      localStorage.setItem("unreadMessages", JSON.stringify(this.unreadMessages));
    }

    // Update UI
    const userLi = document.querySelector(`li[data-username="${username}"]`);
    if (userLi) {
      const notification = userLi.querySelector(".message-notification");
      if (notification) {
        notification.classList.remove("active");
        notification.textContent = "";
      }
    }
  }

  closeChat() {
    const chatOverlay = document.getElementById("chatOverlay");
    if (chatOverlay) {
      chatOverlay.classList.add("hidden");
      chatOverlay.style.display = "none";
      
      // Clear typing status when closing chat
      if (this.isTyping) {
        this.isTyping = false;
        this.sendTypingStatus(false);
      }
      
      this.activeChat = null;
      localStorage.removeItem("activeChat");
      
      // Clear loaded messages when closing chat
      this.loadedMessages = [];
      this.initialLoadDone = false;
      this.typingUsers.clear();
      
      // Clear chat messages UI
      const chatMessages = document.getElementById("chatMessages");
      if (chatMessages) {
        chatMessages.innerHTML = '';
      }

      // Detach scroll listener
      this.destroyScrollListener();
    }
  }

  async loadMessages(username, loadMore = false) {
    const chatMessages = document.getElementById("chatMessages");
    if (!chatMessages) return;

    const state = this.state.getState();
    const currentUser = state.currentUser?.nickname;

    if (!currentUser) return;

    try {
      if (this.isLoading) return;
      this.isLoading = true;

      const offset = loadMore ? this.loadedMessages.length : 0;

      const response = await fetch(
        `/messages?sender=${currentUser}&receiver=${username}&offset=${offset}&limit=10`
      );
      if (!response.ok) {
        throw new Error(`Error fetching messages: ${response.statusText}`);
      }

      const Unsortedmessages = await response.json();

      let messages;
      if (Unsortedmessages) {
        messages = Unsortedmessages.sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );
      }
      if (!messages || messages.length === 0) {
        if (!this.initialLoadDone && !loadMore) {
          chatMessages.innerHTML = `
            <div class="chat-welcome">
              <p>Start chatting with ${username}!</p>
            </div>
          `;
        }
        return;
      }

      // Store current scroll position and height
      const previousScrollHeight = chatMessages.scrollHeight;
      const previousScrollTop = chatMessages.scrollTop;

      if (loadMore) {
        // For loading older messages, prepend them
        this.loadedMessages = [...messages, ...this.loadedMessages];

        // Generate HTML for new messages
        const newMessagesHTML = messages
          .map((msg) => {
            const isOwn = msg.sender === currentUser;
            return ChatUI.createMessageHTML(msg, isOwn);
          })
          .join("");

        // Insert new messages at the top
        chatMessages.insertAdjacentHTML("afterbegin", newMessagesHTML);

        // Restore scroll position
        const newScrollHeight = chatMessages.scrollHeight;
        chatMessages.scrollTop = previousScrollTop + (newScrollHeight - previousScrollHeight);

      } else {
        // For initial load, replace all messages
        this.loadedMessages = messages;
        chatMessages.innerHTML = this.loadedMessages
          .map((msg) => {
            const isOwn = msg.sender === currentUser;
            return ChatUI.createMessageHTML(msg, isOwn);
          })
          .join("");

        // Scroll to bottom for initial load
        this.scrollToBottom();
      }

      this.initialLoadDone = true;
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      this.isLoading = false;
    }
  }

  handleScroll() {
    const chatMessages = document.getElementById("chatMessages");
    if (!chatMessages || !this.activeChat) return;

    // Load more when scrolled near the top (with some threshold)
    if (chatMessages.scrollTop <= 100 && !this.isLoading) {
      this.loadMessages(this.activeChat, true);
    }
  }

  scrollToBottom() {
    const chatMessages = document.getElementById("chatMessages");
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  throttle(func, limit) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  initScrollListener() {
    const chatMessages = document.getElementById("chatMessages");
    if (chatMessages) {
      chatMessages.addEventListener("scroll", this.scrollHandler);
    }
  }

  destroyScrollListener() {
    const chatMessages = document.getElementById("chatMessages");
    if (chatMessages) {
      chatMessages.removeEventListener("scroll", this.scrollHandler);
    }
  }

  updateRecieverSide(senderUsername) {
    const usersJSON = localStorage.getItem('users');
    if (!usersJSON) return;
  
    let usersList = JSON.parse(usersJSON);
  
    const index = usersList.findIndex(user => user.username === senderUsername);
    if (index === -1) return;
  
    const [user] = usersList.splice(index, 1);
    usersList.unshift(user);
  
    localStorage.setItem('users', JSON.stringify(usersList));
  
    console.log("Updated users list in local storage:", usersList);
    this.updateOnlineUsersList(usersList);
  } 

  sendMessage() {
    const chatInput = document.getElementById("chatInput");
    if (!chatInput) {
      console.error("Chat input element not found.");
      return;
    }
    if (!this.activeChat) {
      console.error("No active chat.");
      return;
    }

    const messageText = this.sanitizeInput(chatInput.value);
    if (!messageText) return;

    const state = this.state.getState();
    let currentUser = state.currentUser?.nickname;

    currentUser = currentUser ?? "anonymous";

    // Create new message
    const newMessage = {
      type: "message",
      sender_id: 0,
      sender: currentUser,
      receiver_id: 0,
      receiver: this.activeChat,
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(newMessage));
      // Update user interaction when sending a message too
      this.updateUserInteraction(this.activeChat);
      // Dispatch event when message is sent
      document.dispatchEvent(new CustomEvent('message:sent'));
      
      // Stop typing indicator when message is sent
      if (this.isTyping) {
        this.isTyping = false;
        this.sendTypingStatus(false);
      }
    } else {
      console.error("WebSocket is not open. Retrying...");
      this.retryWebSocketSend(newMessage);
    }
    chatInput.focus();

    // Update UI
    this.addMessageToUI(newMessage, true);

    // Clear input
    chatInput.value = "";
    chatInput.focus();
  }

  sanitizeInput(input) {
    const trimmedInput = input.trim();

    // Escape HTML characters to prevent XSS
    const escapedInput = trimmedInput
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    // Normalize Unicode characters (optional)
    return escapedInput.normalize("NFC");
  }

  addMessageToUI(message, isOwn) {
    const chatMessages = document.getElementById("chatMessages");
    if (!chatMessages) return;

    // Remove welcome message if present
    const welcomeMsg = chatMessages.querySelector(".chat-welcome");
    if (welcomeMsg) {
      chatMessages.innerHTML = "";
    }

    // Add new message
    const messageHTML = ChatUI.createMessageHTML(message, isOwn);
    chatMessages.insertAdjacentHTML("beforeend", messageHTML);

    // Scroll to bottom
    this.scrollToBottom();
  }

  getChatKey(user1, user2) {
    // Create a consistent key for chat regardless of order
    return [user1, user2].sort().join("_");
  }
}