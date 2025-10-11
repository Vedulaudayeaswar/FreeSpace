class CodeGent {
  constructor() {
    this.selectedLanguage = "";
    this.conversationHistory = [];
    this.isProcessing = false;
    this.isListening = false;

    // Add dynamic backend URL
    this.backendURL =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000/api"
        : "https://freespace-ai-platform.onrender.com/api";

    // DOM elements
    this.chatMessages = null;
    this.userInput = null;
    this.sendButton = null;
    this.micButton = null;
    this.languageSelect = null;
    this.connectionStatus = null;
    this.codeEditor = null;
    this.codeOutput = null;

    this.init();
  }

  async init() {
    try {
      console.log("CodeGent initializing...");

      if (document.readyState === "loading") {
        await new Promise((resolve) => {
          document.addEventListener("DOMContentLoaded", resolve);
        });
      }

      this.setupDOM();
      this.setupEventListeners();
      await this.startCodeGent();

      console.log("CodeGent initialized successfully");
    } catch (error) {
      console.error("Failed to initialize CodeGent:", error);
      this.showStatus(
        "Failed to initialize CodeGent. Please refresh the page.",
        "error"
      );
    }
  }

  setupDOM() {
    this.chatMessages = document.getElementById("chatMessages");
    this.userInput = document.getElementById("userInput");
    this.sendButton = document.getElementById("sendButton");
    this.micButton = document.getElementById("micButton");
    this.languageSelect = document.getElementById("languageSelect");
    this.connectionStatus = document.getElementById("connectionStatus");
    this.codeEditor = document.getElementById("codeEditor");
    this.codeOutput = document.getElementById("codeOutput");

    console.log("DOM elements loaded:", {
      chatMessages: !!this.chatMessages,
      userInput: !!this.userInput,
      sendButton: !!this.sendButton,
      languageSelect: !!this.languageSelect,
      codeEditor: !!this.codeEditor,
    });
  }

  setupEventListeners() {
    // Language selection
    if (this.languageSelect) {
      this.languageSelect.addEventListener("change", (e) => {
        this.selectedLanguage = e.target.value;
        this.updateLanguageContext();
      });
    }

    // Send message
    if (this.sendButton) {
      this.sendButton.addEventListener("click", () => this.handleSendMessage());
    }

    // Enter key for input
    if (this.userInput) {
      this.userInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage();
        }
      });
    }

    // Microphone
    if (this.micButton) {
      this.micButton.addEventListener("click", () => this.toggleVoiceInput());
    }

    // Code editor controls
    this.setupCodeEditorControls();

    // Quick action buttons
    this.setupQuickActions();

    // Resource cards
    this.setupResourceCards();

    // Navigation
    this.setupNavigation();
  }

  setupCodeEditorControls() {
    const runCodeBtn = document.getElementById("runCodeBtn");
    const clearCodeBtn = document.getElementById("clearCodeBtn");
    const copyCodeBtn = document.getElementById("copyCodeBtn");
    const downloadCodeBtn = document.getElementById("downloadCodeBtn");
    const clearOutputBtn = document.getElementById("clearOutputBtn");

    if (runCodeBtn) {
      runCodeBtn.addEventListener("click", () => this.runCode());
    }

    if (clearCodeBtn) {
      clearCodeBtn.addEventListener("click", () => this.clearCode());
    }

    if (copyCodeBtn) {
      copyCodeBtn.addEventListener("click", () => this.copyCode());
    }

    if (downloadCodeBtn) {
      downloadCodeBtn.addEventListener("click", () => this.downloadCode());
    }

    if (clearOutputBtn) {
      clearOutputBtn.addEventListener("click", () => this.clearOutput());
    }
  }

  setupQuickActions() {
    const quickButtons = document.querySelectorAll(".quick-btn[data-action]");
    quickButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.getAttribute("data-action");
        this.handleQuickAction(action);
      });
    });
  }

  setupResourceCards() {
    const resourceCards = document.querySelectorAll(
      ".resource-card[data-lang]"
    );
    resourceCards.forEach((card) => {
      card.addEventListener("click", () => {
        const lang = card.getAttribute("data-lang");
        this.languageSelect.value = lang;
        this.selectedLanguage = lang;
        this.updateLanguageContext();
      });
    });
  }

  setupNavigation() {
    const homeBtn = document.querySelector(".home-btn");
    const zenBtn = document.querySelector(".zen-btn");

    if (homeBtn) {
      homeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "who-are-you.html";
      });
    }

    if (zenBtn) {
      zenBtn.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "zenmode.html";
      });
    }
  }

  async startCodeGent() {
    try {
      this.showStatus("Connecting to CodeGent...", "connecting");

      // Update URL to use dynamic backend
      const response = await fetch(`${this.backendURL}/codegent/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: JSON.parse(localStorage.getItem("currentUser") || "{}"),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        this.clearInitialMessage();
        this.addMessage(data.message, "ai-message");
        this.showStatus(
          "CodeGent ready! Select a language and start coding.",
          "ready"
        );
      } else {
        throw new Error(data.error || "Failed to start CodeGent");
      }
    } catch (error) {
      console.error("Connection failed:", error);
      this.showStatus("Offline mode - Basic features available", "error");
      this.clearInitialMessage();
      this.addMessage(
        "Welcome to CodeGent! I'm your personal coding agent. I can help you with Python, Java, C++, and Go programming. Select a language above and let's start coding together!",
        "ai-message"
      );
    }
  }

  updateLanguageContext() {
    if (this.selectedLanguage) {
      const languageNames = {
        python: "Python",
        java: "Java",
        cpp: "C++",
        golang: "Go",
      };

      this.showStatus(
        `Ready to help with ${languageNames[this.selectedLanguage]}!`,
        "ready"
      );
      this.addMessage(
        `Great! I'm now ready to help you with ${
          languageNames[this.selectedLanguage]
        } programming. What would you like to work on?`,
        "ai-message"
      );
    }
  }

  async handleSendMessage() {
    const message = this.userInput?.value?.trim();
    if (!message || this.isProcessing) return;

    if (!this.selectedLanguage) {
      this.showStatus("Please select a programming language first!", "error");
      return;
    }

    this.addMessage(message, "user-message");
    this.userInput.value = "";
    this.isProcessing = true;
    this.updateSendButton(true);

    try {
      this.showStatus("CodeGent is analyzing...", "processing");

      // Update URL to use dynamic backend
      const response = await fetch(`${this.backendURL}/codegent/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message,
          language: this.selectedLanguage,
          conversation_history: this.conversationHistory.slice(-10),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        this.addMessage(data.response, "ai-message");

        // If there's code in the response, add it to the editor
        if (data.code) {
          this.setCodeInEditor(data.code, this.selectedLanguage);
        }

        this.showStatus("Ready for your next question", "ready");
      } else {
        throw new Error(data.error || "Failed to get response");
      }
    } catch (error) {
      console.error("Response error:", error);
      this.addMessage(
        "I'm having trouble processing that right now. Could you please try again? I'm here to help with coding in Python, Java, C++, and Go.",
        "ai-message"
      );
      this.showStatus("Error - please try again", "error");
    } finally {
      this.isProcessing = false;
      this.updateSendButton(false);
    }
  }

  async handleQuickAction(action) {
    if (!this.selectedLanguage) {
      this.showStatus("Please select a programming language first!", "error");
      return;
    }

    const currentCode = this.codeEditor?.value?.trim();
    let prompt = "";

    switch (action) {
      case "explain-concept":
        prompt = `Can you explain a key concept in ${this.selectedLanguage} programming?`;
        break;
      case "debug-code":
        if (currentCode) {
          prompt = `Please debug this ${this.selectedLanguage} code:\n\n${currentCode}`;
        } else {
          prompt = `Show me common debugging techniques in ${this.selectedLanguage}.`;
        }
        break;
      case "optimize-code":
        if (currentCode) {
          prompt = `Please optimize this ${this.selectedLanguage} code:\n\n${currentCode}`;
        } else {
          prompt = `Show me optimization techniques for ${this.selectedLanguage}.`;
        }
        break;
      case "generate-tests":
        if (currentCode) {
          prompt = `Generate unit tests for this ${this.selectedLanguage} code:\n\n${currentCode}`;
        } else {
          prompt = `Show me how to write unit tests in ${this.selectedLanguage}.`;
        }
        break;
      case "code-review":
        if (currentCode) {
          prompt = `Please review this ${this.selectedLanguage} code and suggest improvements:\n\n${currentCode}`;
        } else {
          prompt = `What are the best practices for ${this.selectedLanguage} code review?`;
        }
        break;
      case "algorithm-help":
        prompt = `Can you help me with algorithms and data structures in ${this.selectedLanguage}?`;
        break;
    }

    if (prompt) {
      this.userInput.value = prompt;
      await this.handleSendMessage();
    }
  }

  async toggleVoiceInput() {
    if (this.isListening) {
      this.stopVoiceInput();
    } else {
      await this.startVoiceInput();
    }
  }

  async startVoiceInput() {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      this.showStatus(
        "Speech recognition not supported in this browser",
        "error"
      );
      return;
    }

    try {
      this.isListening = true;
      this.updateMicButton(true);
      this.showStatus(
        "🎤 Listening... Speak your coding question",
        "processing"
      );

      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        this.userInput.value = transcript;
        this.stopVoiceInput();
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        this.stopVoiceInput();
        this.showStatus(
          "Voice input failed. Please try typing instead.",
          "error"
        );
      };

      recognition.onend = () => {
        this.stopVoiceInput();
      };

      recognition.start();
    } catch (error) {
      console.error("Voice input error:", error);
      this.stopVoiceInput();
      this.showStatus(
        "Voice input failed. Please check microphone permissions.",
        "error"
      );
    }
  }

  stopVoiceInput() {
    this.isListening = false;
    this.updateMicButton(false);
    this.showStatus("Ready to help with coding", "ready");
  }

  runCode() {
    const code = this.codeEditor?.value?.trim();
    if (!code) {
      this.addToOutput("No code to run. Please write some code first.");
      return;
    }

    if (!this.selectedLanguage) {
      this.addToOutput("Please select a programming language first.");
      return;
    }

    // Simulate code execution (in a real app, this would call a backend service)
    this.addToOutput(`Running ${this.selectedLanguage} code...`);
    this.addToOutput(
      "Note: This is a simulation. In a real environment, code would be executed safely."
    );

    // Example output based on language
    setTimeout(() => {
      switch (this.selectedLanguage) {
        case "python":
          this.addToOutput(
            "Python code executed successfully!\nOutput: Hello, CodeGent!"
          );
          break;
        case "java":
          this.addToOutput(
            "Java compiled and executed successfully!\nOutput: Hello, CodeGent!"
          );
          break;
        case "cpp":
          this.addToOutput(
            "C++ compiled and executed successfully!\nOutput: Hello, CodeGent!"
          );
          break;
        case "golang":
          this.addToOutput(
            "Go built and executed successfully!\nOutput: Hello, CodeGent!"
          );
          break;
        default:
          this.addToOutput("Code execution completed.");
      }
    }, 1500);
  }

  clearCode() {
    if (this.codeEditor) {
      this.codeEditor.value = "";
      this.addToOutput("Code editor cleared.");
    }
  }

  async copyCode() {
    const code = this.codeEditor?.value;
    if (!code) {
      this.showStatus("No code to copy", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      this.showStatus("Code copied to clipboard!", "ready");
    } catch (error) {
      console.error("Copy failed:", error);
      this.showStatus("Failed to copy code", "error");
    }
  }

  downloadCode() {
    const code = this.codeEditor?.value;
    if (!code) {
      this.showStatus("No code to download", "error");
      return;
    }

    const extensions = {
      python: "py",
      java: "java",
      cpp: "cpp",
      golang: "go",
    };

    const extension = extensions[this.selectedLanguage] || "txt";
    const filename = `codegent_code.${extension}`;

    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showStatus(`Code downloaded as ${filename}`, "ready");
  }

  clearOutput() {
    if (this.codeOutput) {
      this.codeOutput.innerHTML =
        '<p class="output-placeholder">Code output will appear here...</p>';
    }
  }

  setCodeInEditor(code, language) {
    if (this.codeEditor) {
      this.codeEditor.value = code;
      this.addToOutput(`Code loaded in editor (${language})`);
    }
  }

  addToOutput(text) {
    if (!this.codeOutput) return;

    if (this.codeOutput.querySelector(".output-placeholder")) {
      this.codeOutput.innerHTML = "";
    }

    const outputLine = document.createElement("div");
    outputLine.textContent = text;
    outputLine.style.marginBottom = "0.25rem";
    outputLine.style.color = "rgba(255, 255, 255, 0.9)";

    this.codeOutput.appendChild(outputLine);
    this.codeOutput.scrollTop = this.codeOutput.scrollHeight;
  }

  addMessage(message, messageClass) {
    if (!this.chatMessages) return;

    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${messageClass}`;

    const messageAvatar = document.createElement("div");
    messageAvatar.className = "message-avatar";

    if (messageClass === "ai-message") {
      messageAvatar.innerHTML = '<i class="fas fa-robot"></i>';
    } else {
      messageAvatar.innerHTML = '<i class="fas fa-user"></i>';
    }

    const messageContent = document.createElement("div");
    messageContent.className = "message-content";

    // Process message for code blocks
    const processedMessage = this.processMessageContent(message);
    messageContent.innerHTML = processedMessage;

    const messageTime = document.createElement("div");
    messageTime.className = "message-time";
    messageTime.textContent = new Date().toLocaleTimeString();

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

  processMessageContent(message) {
    // Convert code blocks (```language...```) to formatted code
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    let processedMessage = message.replace(
      codeBlockRegex,
      (match, language, code) => {
        const lang = language || this.selectedLanguage || "text";
        return `<div class="code-block">
        <button class="copy-btn" onclick="navigator.clipboard.writeText(\`${code.trim()}\`)">Copy</button>
        <pre><code class="language-${lang}">${this.escapeHtml(
          code.trim()
        )}</code></pre>
      </div>`;
      }
    );

    // Convert inline code (`code`) to formatted code
    const inlineCodeRegex = /`([^`]+)`/g;
    processedMessage = processedMessage.replace(
      inlineCodeRegex,
      '<code style="background: rgba(0,0,0,0.3); padding: 0.2rem 0.4rem; border-radius: 4px; font-family: monospace;">$1</code>'
    );

    return `<p>${processedMessage}</p>`;
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  clearInitialMessage() {
    if (this.chatMessages) {
      const initialMessage = this.chatMessages.querySelector(
        ".message.ai-message"
      );
      if (initialMessage) {
        initialMessage.remove();
      }
    }
  }

  showStatus(message, type = "info") {
    if (this.connectionStatus) {
      this.connectionStatus.textContent = message;
      this.connectionStatus.className = `status ${type}`;
    }
    console.log(`CodeGent Status (${type}): ${message}`);
  }

  updateSendButton(disabled) {
    if (this.sendButton) {
      this.sendButton.disabled = disabled;
      if (disabled) {
        this.sendButton.innerHTML = '<div class="loading"></div> Processing...';
      } else {
        this.sendButton.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
      }
    }
  }

  updateMicButton(listening) {
    if (this.micButton) {
      if (listening) {
        this.micButton.innerHTML = '<i class="fas fa-stop"></i>';
        this.micButton.style.background = "rgba(220, 53, 69, 0.3)";
      } else {
        this.micButton.innerHTML = '<i class="fas fa-microphone"></i>';
        this.micButton.style.background = "rgba(255, 255, 255, 0.1)";
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

// Initialize CodeGent
let codeGent;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    codeGent = new CodeGent();
  });
} else {
  codeGent = new CodeGent();
}

// Export for debugging
window.codeGent = codeGent;
