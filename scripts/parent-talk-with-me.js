// ParentBot Voice Assistant - Complete Implementation
class ParentVoiceAssistant {
  constructor() {
    this.isListening = false;
    this.isProcessing = false;
    this.conversationHistory = [];
    this.parentContext = {
      name: "Parent",
      currentTask: null,
      preferences: [],
    };

    // Dynamic backend URL for production
    this.backendURL =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000/api"
        : "https://freespace-ai-platform.onrender.com/api";

    // DOM elements - Updated to match your HTML
    this.chatMessages = null;
    this.talkButton = null;
    this.stopButton = null;
    this.connectionStatus = null;
    this.quickButtons = null;

    this.init();
  }

  async init() {
    try {
      console.log("ParentBot Voice Assistant loading...");

      // Wait for DOM to be ready
      if (document.readyState === "loading") {
        await new Promise((resolve) => {
          document.addEventListener("DOMContentLoaded", resolve);
        });
      }

      this.setupDOM();
      this.setupEventListeners();
      this.setupTimeDisplay();
      await this.startConversation();

      console.log("ParentBot Voice Assistant initialized successfully");
    } catch (error) {
      console.error("Failed to initialize ParentBot:", error);
      this.showError(
        "Failed to initialize ParentBot. Please refresh the page."
      );
    }
  }

  setupDOM() {
    // Get DOM elements matching your HTML structure
    this.chatMessages = document.getElementById("chatMessages");
    this.talkButton = document.getElementById("talkButton");
    this.stopButton = document.getElementById("stopButton");
    this.connectionStatus = document.getElementById("connectionStatus");
    this.quickButtons = document.querySelectorAll(".quick-btn");

    console.log("DOM setup complete:");
    console.log("- Chat messages:", !!this.chatMessages);
    console.log("- Talk button:", !!this.talkButton);
    console.log("- Stop button:", !!this.stopButton);
    console.log("- Connection status:", !!this.connectionStatus);
    console.log("- Quick buttons:", this.quickButtons.length);
  }

  setupEventListeners() {
    // Talk button - main interaction
    if (this.talkButton) {
      this.talkButton.addEventListener("click", () => {
        if (this.isListening) {
          this.stopListening();
        } else {
          this.startListening();
        }
      });
    }

    // Stop button
    if (this.stopButton) {
      this.stopButton.addEventListener("click", () => {
        this.stopListening();
        if ("speechSynthesis" in window) {
          speechSynthesis.cancel();
        }
      });
    }

    // Quick response buttons
    this.quickButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const response = button.getAttribute("data-response");
        if (response) {
          this.handleQuickResponse(response);
        }
      });
    });

    // Home navigation
    const homeBtn = document.querySelector(".home-btn");
    if (homeBtn) {
      homeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "who-are-you.html";
      });
    }

    // Zen mode navigation
    const zenBtn = document.querySelector(".zen-btn");
    if (zenBtn) {
      zenBtn.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "zenmode.html";
      });
    }
  }

  setupTimeDisplay() {
    const timeDisplay = document.getElementById("currentTime");
    if (timeDisplay) {
      const updateTime = () => {
        const now = new Date();
        const istTime = new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }).format(now);
        timeDisplay.textContent = istTime;
      };

      updateTime();
      setInterval(updateTime, 1000);
    }
  }

  async startConversation() {
    try {
      this.showStatus("Connecting to ParentBot...", "connecting");

      // Get user data from localStorage
      const currentUser = JSON.parse(localStorage.getItem("currentUser")) || {};
      const userName = currentUser.name || "Parent";

      this.parentContext.name = userName;

      // Updated to use dynamic URL
      const response = await fetch(
        `${this.backendURL}/parent/start-conversation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: userName,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        this.clearInitialMessage();
        this.addMessage(data.message, "ai-message");
        this.showStatus("Ready! Click 'Talk to ParentBot' to start", "ready");
        this.enableTalkButton();
      } else {
        throw new Error(data.error || "Failed to start conversation");
      }
    } catch (error) {
      console.error("Failed to start conversation:", error);
      this.showError("Connection failed. Using offline mode.");
      this.clearInitialMessage();
      this.addMessage(
        "Hello! I'm ParentBot, your AI parenting assistant. I'm here to help you with meal planning, creating todo lists, parenting guidance, bedtime stories for your kids, and money management. What can I help you with today?",
        "ai-message"
      );
      this.showStatus(
        "Offline mode - Click to talk or use quick buttons",
        "offline"
      );
      this.enableTalkButton();
    }
  }

  clearInitialMessage() {
    if (this.chatMessages) {
      // Remove the initial loading message
      const initialMessage = this.chatMessages.querySelector(
        ".message.ai-message"
      );
      if (initialMessage) {
        initialMessage.remove();
      }
    }
  }

  enableTalkButton() {
    if (this.talkButton) {
      this.talkButton.disabled = false;
      this.talkButton.style.opacity = "1";
      this.talkButton.style.pointerEvents = "auto";
    }
  }

  async handleQuickResponse(responseText) {
    if (this.isProcessing) return;

    this.addMessage(responseText, "user-message");
    await this.getAIResponse(responseText);
  }

  async getAIResponse(message) {
    this.isProcessing = true;
    this.showStatus("ParentBot is thinking...", "processing");

    try {
      // Updated to use dynamic URL
      const response = await fetch(`${this.backendURL}/parent/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        this.addMessage(data.response, "ai-message");
        this.showStatus(
          "Ready! Click 'Talk to ParentBot' to continue",
          "ready"
        );

        // Auto-speak the response
        await this.speakText(data.response);
      } else {
        throw new Error(data.error || "Failed to get response");
      }
    } catch (error) {
      console.error("Failed to get response:", error);
      this.addMessage(
        "I'm having trouble processing that right now. Could you please try again? I'm here to help with meal planning, todo lists, parenting tips, bedtime stories, or money management.",
        "ai-message"
      );
      this.showStatus("Error - please try again", "error");
    } finally {
      this.isProcessing = false;
    }
  }

  async startListening() {
    if (this.isListening) return;

    try {
      this.isListening = true;
      this.updateTalkButton(true);
      this.showStatus("🎤 Listening... Speak now", "listening");

      // Check if browser supports speech recognition
      if (
        !("webkitSpeechRecognition" in window) &&
        !("SpeechRecognition" in window)
      ) {
        throw new Error("Speech recognition not supported in this browser");
      }

      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        console.log("Heard:", transcript);

        this.stopListening();
        this.addMessage(transcript, "user-message");
        await this.getAIResponse(transcript);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        this.stopListening();
        this.showError(
          "Speech recognition failed. Please try again or use quick buttons."
        );
      };

      recognition.onend = () => {
        this.stopListening();
      };

      recognition.start();
    } catch (error) {
      console.error("Failed to start listening:", error);
      this.stopListening();
      this.showError(
        "Microphone access failed. Please check permissions or use quick buttons."
      );
    }
  }

  stopListening() {
    this.isListening = false;
    this.updateTalkButton(false);
    this.showStatus(
      "Ready! Click 'Talk to ParentBot' or use quick buttons",
      "ready"
    );
  }

  async speakText(text) {
    try {
      // Updated to use dynamic URL
      const response = await fetch(`${this.backendURL}/parent/speak`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
        }),
      });

      if (!response.ok) {
        throw new Error("Server TTS unavailable");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Server TTS failed");
      }
    } catch (error) {
      console.error("Server TTS error:", error);
      // Fallback to browser TTS
      this.fallbackTTS(text);
    }
  }

  fallbackTTS(text) {
    if ("speechSynthesis" in window) {
      // Cancel any ongoing speech
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;

      // Try to get a female voice
      const voices = speechSynthesis.getVoices();
      const femaleVoice = voices.find(
        (voice) =>
          voice.name.includes("Female") ||
          voice.name.includes("Zira") ||
          voice.name.includes("Google UK English Female") ||
          voice.gender === "female"
      );

      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      speechSynthesis.speak(utterance);
    }
  }

  addMessage(message, messageClass) {
    if (!this.chatMessages) {
      console.error("Chat messages container not available");
      return;
    }

    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${messageClass}`;

    const messageAvatar = document.createElement("div");
    messageAvatar.className = "message-avatar";

    if (messageClass === "ai-message") {
      messageAvatar.innerHTML = '<i class="fas fa-home"></i>';
    } else {
      messageAvatar.innerHTML = '<i class="fas fa-user"></i>';
    }

    const messageContent = document.createElement("div");
    messageContent.className = "message-content";

    const messageParagraph = document.createElement("p");
    messageParagraph.textContent = message;

    const messageTime = document.createElement("div");
    messageTime.className = "message-time";
    messageTime.textContent = new Date().toLocaleTimeString();

    messageContent.appendChild(messageParagraph);
    messageContent.appendChild(messageTime);

    messageDiv.appendChild(messageAvatar);
    messageDiv.appendChild(messageContent);

    this.chatMessages.appendChild(messageDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

    // Store in conversation history
    this.conversationHistory.push({
      message: message,
      sender: messageClass,
      timestamp: new Date().toISOString(),
    });
  }

  showStatus(message, type = "info") {
    if (this.connectionStatus) {
      this.connectionStatus.textContent = message;
      this.connectionStatus.className = `status ${type}`;
    }
    console.log(`Status (${type}): ${message}`);
  }

  showError(message) {
    this.showStatus(message, "error");
    console.error("ParentBot Error:", message);
  }

  updateTalkButton(listening) {
    if (this.talkButton) {
      const icon = this.talkButton.querySelector("i");
      const span = this.talkButton.querySelector("span");

      if (listening) {
        this.talkButton.classList.add("listening");
        if (icon) icon.className = "fas fa-stop";
        if (span) span.textContent = "Stop Listening";
      } else {
        this.talkButton.classList.remove("listening");
        if (icon) icon.className = "fas fa-microphone";
        if (span) span.textContent = "Talk to ParentBot";
      }
    }
  }
}

// Add this to all your chat JavaScript files (student, parent, professional, codegent)

class BrowserSpeechHandler {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.initSpeechRecognition();
  }

  initSpeechRecognition() {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();

      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = "en-US";

      this.recognition.onstart = () => {
        this.isListening = true;
        console.log("🎤 Listening...");
        this.updateMicButton(true);
      };

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log("🗣️ Heard:", transcript);
        this.handleSpeechResult(transcript);
      };

      this.recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        this.isListening = false;
        this.updateMicButton(false);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.updateMicButton(false);
      };
    }
  }

  startListening() {
    if (this.recognition && !this.isListening) {
      this.recognition.start();
    } else {
      alert(
        "Speech recognition not supported in this browser. Please use Chrome."
      );
    }
  }

  handleSpeechResult(transcript) {
    // Put the transcript in the input field
    const messageInput = document.getElementById("messageInput");
    if (messageInput) {
      messageInput.value = transcript;
    }

    // Automatically send the message
    sendMessage();
  }

  updateMicButton(listening) {
    const micButton = document.getElementById("micButton");
    if (micButton) {
      micButton.textContent = listening ? "🔴" : "🎤";
      micButton.disabled = listening;
    }
  }
}

// Initialize speech handler
const speechHandler = new BrowserSpeechHandler();

// Update your microphone button click handler
function startListening() {
  speechHandler.startListening();
}

// Add browser TTS function
function speakText(text) {
  if ("speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(text);

    // Try to use a female voice
    const voices = speechSynthesis.getVoices();
    const femaleVoice = voices.find(
      (voice) =>
        voice.name.toLowerCase().includes("female") ||
        voice.name.toLowerCase().includes("zira") ||
        voice.name.toLowerCase().includes("hazel")
    );

    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 0.9;

    speechSynthesis.speak(utterance);
    console.log("🗣️ Speaking:", text.substring(0, 50) + "...");
  }
}

// Update your message response handler
function handleResponse(data) {
  if (data.success && data.response) {
    // Display the response
    displayMessage(data.response, "ai");

    // Handle voice output
    if (data.use_browser_tts) {
      speakText(data.response);
    }
  }
}

// Initialize ParentBot when the script loads
let parentBot;

// Wait for DOM content to load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    parentBot = new ParentVoiceAssistant();
  });
} else {
  parentBot = new ParentVoiceAssistant();
}

// Export for debugging
window.parentBot = parentBot;

// Load voices when they become available
if ("speechSynthesis" in window) {
  speechSynthesis.onvoiceschanged = () => {
    console.log("Voices loaded:", speechSynthesis.getVoices().length);
  };
}
