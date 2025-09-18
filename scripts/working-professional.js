class LunaProfessionalAssistant {
  constructor() {
    // Updated baseURL for production
    this.baseURL =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000/api"
        : "https://freespace-ai-platform.onrender.com/api";

    this.sessionStartTime = Date.now();
    this.messageCount = 0;
    this.isRecording = false;
    this.isConnected = false;
    this.isListening = false;
    this.isSpeaking = false;
    this.settings = {
      voiceEnabled: true,
      autoScroll: true,
      professionalName: "Professional",
    };

    // Voice services
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.lunaVoice = null;

    this.init();
    this.loadSettings();
    this.initVoiceServices();
    this.connectToLuna();
  }

  init() {
    this.bindElements();
    this.setupEventListeners();
    this.startSessionTimer();
    this.updateUI();
  }

  // Initialize voice services like student version
  initVoiceServices() {
    // Speech Recognition Setup
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();

      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = "en-US";

      this.recognition.onstart = () => {
        console.log("🎤 Listening to professional...");
        this.updateStatus("Listening to your concerns...", "listening");
        if (this.voiceBtn) {
          this.voiceBtn.innerHTML =
            '<i class="fas fa-microphone-alt"></i> Listening...';
          this.voiceBtn.classList.add("listening");
        }
        this.isListening = true;
      };

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log("📝 Professional said:", transcript);
        this.handleVoiceInput(transcript);
      };

      this.recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        this.updateStatus("Voice error - please try again", "error");
        this.stopListening();
      };

      this.recognition.onend = () => {
        this.stopListening();
      };
    }

    // Speech Synthesis Setup
    if (this.synthesis) {
      const loadVoices = () => {
        const voices = this.synthesis.getVoices();
        // Find a suitable voice for Luna (preferably female)
        this.lunaVoice =
          voices.find(
            (voice) =>
              voice.name.includes("Zira") ||
              voice.name.includes("Female") ||
              voice.name.toLowerCase().includes("female") ||
              voice.name.includes("Hazel")
          ) || voices[0];

        console.log(
          "🌙 Luna voice selected:",
          this.lunaVoice?.name || "Default"
        );
      };

      if (this.synthesis.getVoices().length === 0) {
        this.synthesis.onvoiceschanged = loadVoices;
      } else {
        loadVoices();
      }
    }
  }

  bindElements() {
    // Status elements
    this.statusDot = document.getElementById("connectionStatus");
    this.statusText = document.getElementById("statusText");
    this.assistantStatus = document.getElementById("assistantStatus");

    // Chat elements
    this.messagesContainer = document.getElementById("messagesContainer");
    this.textInput = document.getElementById("textInput");
    this.sendBtn = document.getElementById("sendBtn");
    this.voiceBtn = document.getElementById("voiceBtn");
    this.voiceIndicator = document.getElementById("voiceIndicator");

    // Control elements
    this.clearChatBtn = document.getElementById("clearChat");
    this.settingsBtn = document.getElementById("settingsBtn");
    this.settingsModal = document.getElementById("settingsModal");
    this.closeSettingsBtn = document.getElementById("closeSettings");

    // Sidebar elements
    this.stressBar = document.getElementById("stressBar");
    this.stressLabel = document.getElementById("stressLabel");
    this.sessionTime = document.getElementById("sessionTime");
    this.messageCountEl = document.getElementById("messageCount");

    // Quick action buttons
    this.breathingBtn = document.getElementById("breathingExercise");
    this.stressReliefBtn = document.getElementById("stressRelief");
    this.workBalanceBtn = document.getElementById("workBalance");

    // Settings elements
    this.voiceToggle = document.getElementById("voiceToggle");
    this.autoScrollToggle = document.getElementById("autoScrollToggle");
    this.professionalNameInput = document.getElementById("professionalName");

    // Loading overlay
    this.loadingOverlay = document.getElementById("loadingOverlay");
  }

  setupEventListeners() {
    // Send message events
    this.sendBtn.addEventListener("click", () => this.sendMessage());
    this.textInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Voice recording events - now using web speech API like student version
    this.voiceBtn.addEventListener("click", () => this.startListening());

    // Control events
    this.clearChatBtn.addEventListener("click", () => this.clearChat());
    this.settingsBtn.addEventListener("click", () => this.openSettings());
    this.closeSettingsBtn.addEventListener("click", () => this.closeSettings());

    // Modal events
    this.settingsModal.addEventListener("click", (e) => {
      if (e.target === this.settingsModal) {
        this.closeSettings();
      }
    });

    // Settings events
    this.voiceToggle.addEventListener("change", (e) => {
      this.settings.voiceEnabled = e.target.checked;
      this.saveSettings();
    });

    this.autoScrollToggle.addEventListener("change", (e) => {
      this.settings.autoScroll = e.target.checked;
      this.saveSettings();
    });

    this.professionalNameInput.addEventListener("change", (e) => {
      this.settings.professionalName = e.target.value || "Professional";
      this.saveSettings();
    });

    // Quick action events
    this.breathingBtn.addEventListener("click", () =>
      this.triggerBreathingExercise()
    );
    this.stressReliefBtn.addEventListener("click", () =>
      this.triggerStressRelief()
    );
    this.workBalanceBtn.addEventListener("click", () =>
      this.triggerWorkBalance()
    );

    // Auto-resize text input
    this.textInput.addEventListener("input", () => this.autoResizeInput());
  }

  // Start listening using web speech API like student version
  startListening() {
    if (!this.recognition) {
      alert(
        "Speech recognition not supported. Please use Chrome or Edge browser."
      );
      return;
    }

    if (this.isListening) return;

    this.stopSpeaking(); // Stop any current speech

    try {
      this.isListening = true;
      this.recognition.start();
    } catch (error) {
      console.error("Error starting recognition:", error);
      this.isListening = false;
    }
  }

  // Stop listening
  stopListening() {
    this.isListening = false;

    if (this.recognition) {
      this.recognition.stop();
    }

    if (this.voiceBtn) {
      this.voiceBtn.innerHTML =
        '<i class="fas fa-microphone"></i><span class="voice-status">Hold to speak</span>';
      this.voiceBtn.classList.remove("listening");
    }

    if (!this.isSpeaking) {
      this.updateStatus("Luna is ready to help 🌙", "ready");
    }
  }

  // Handle voice input like student version
  async handleVoiceInput(transcript) {
    try {
      // Add professional message to chat
      this.displayMessage(transcript, "user");
      this.updateMessageCount();
      this.updateStatus("Luna is thinking...", "thinking");

      // Send to backend using the /respond endpoint like student version
      const response = await fetch(`${this.baseURL}/professional/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: transcript,
          enable_voice: this.settings.voiceEnabled,
        }),
      });

      const data = await response.json();

      if (data.success && data.response) {
        // Add Luna's response to chat
        this.displayMessage(data.response, "assistant");

        // Update stress level if available
        if (data.professional_context) {
          this.updateStressLevel(data.professional_context.stress_level);
        }

        // Speak Luna's response using web speech synthesis
        if (this.settings.voiceEnabled) {
          await this.speakResponse(data.response);
        }

        this.updateMessageCount();
      } else {
        const fallback =
          "I'm here to help you with workplace wellness. What specific challenge are you facing?";
        this.displayMessage(fallback, "assistant");
        if (this.settings.voiceEnabled) {
          await this.speakResponse(fallback);
        }
      }
    } catch (error) {
      console.error("Error handling voice input:", error);
      const errorMsg =
        "I'm having some technical difficulties. Let me try to help you in a different way.";
      this.displayMessage(errorMsg, "assistant");
      if (this.settings.voiceEnabled) {
        await this.speakResponse(errorMsg);
      }
    }
  }

  // Speak response using web speech synthesis like student version
  async speakResponse(text) {
    return new Promise((resolve) => {
      if (!this.synthesis || this.isSpeaking) {
        resolve();
        return;
      }

      // Stop any current speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      if (this.lunaVoice) {
        utterance.voice = this.lunaVoice;
      }

      utterance.rate = 0.8; // Professional pace
      utterance.pitch = 1.0; // Natural pitch for workplace support
      utterance.volume = 0.9;

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.updateStatus("🗣️ Luna is speaking...", "speaking");
        this.assistantStatus.textContent = "Speaking response...";
        console.log("🗣️ Luna is speaking...");
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.updateStatus("Luna is ready to help 🌙", "ready");
        this.assistantStatus.textContent =
          "Ready to support your wellness journey";
        console.log("✅ Luna finished speaking");
        resolve();
      };

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event.error);
        this.isSpeaking = false;
        this.updateStatus("Voice error occurred", "error");
        resolve();
      };

      this.synthesis.speak(utterance);
    });
  }

  // Stop speaking
  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.isSpeaking = false;
      this.updateStatus("Luna is ready to help 🌙", "ready");
    }
  }

  // Update status like student version
  updateStatus(message, type = "ready") {
    if (this.statusText) {
      this.statusText.textContent = message;
      this.statusText.className = `status ${type}`;
    }
  }

  async connectToLuna() {
    try {
      this.updateConnectionStatus("Connecting to Luna...", false);

      // Test backend connection first - Updated URL
      const testResponse = await fetch(this.baseURL.replace("/api", "/"));
      if (!testResponse.ok) throw new Error("Luna backend not running");

      const response = await this.makeRequest(
        "/professional/workplace-support",
        {
          method: "POST",
          body: JSON.stringify({
            name: this.settings.professionalName,
            stress_level: "high",
            work_environment: "office",
          }),
        }
      );

      if (response.success) {
        this.isConnected = true;
        this.updateConnectionStatus("Connected to Luna", true);
        this.assistantStatus.textContent =
          "Ready to support your wellness journey";
        this.updateStatus("Luna is ready to help 🌙", "ready");

        // Display welcome message
        this.displayMessage(response.message, "assistant");

        // Speak welcome message
        if (this.settings.voiceEnabled) {
          await this.speakResponse(response.message);
        }

        console.log("✅ Connected to Luna successfully");
      } else {
        throw new Error("Failed to connect to Luna");
      }
    } catch (error) {
      console.error("❌ Connection failed:", error);
      this.updateConnectionStatus("Connection failed", false);
      this.updateStatus(
        "Connection failed - Make sure Luna backend is running",
        "error"
      );
      this.assistantStatus.textContent = "Having trouble connecting";
      this.displayMessage(
        "I'm having trouble connecting right now, but I'm still here for you. You can still type your messages.",
        "assistant"
      );
    }
  }

  updateConnectionStatus(text, connected) {
    this.statusText.textContent = text;
    this.statusDot.classList.toggle("connected", connected);
    this.isConnected = connected;
  }

  async sendMessage() {
    const message = this.textInput.value.trim();
    if (!message) return;

    // Display user message
    this.displayMessage(message, "user");
    this.textInput.value = "";
    this.updateMessageCount();

    // Show loading
    this.showLoading("Luna is thinking...");

    try {
      // Send to backend using /respond endpoint like student version
      const response = await this.makeRequest("/professional/respond", {
        method: "POST",
        body: JSON.stringify({
          message: message,
          enable_voice: this.settings.voiceEnabled,
        }),
      });

      this.hideLoading();

      if (response.success) {
        // Display assistant response
        this.displayMessage(response.response, "assistant");

        // Update stress level based on context
        if (response.professional_context) {
          this.updateStressLevel(response.professional_context.stress_level);
        }

        // Speak response if voice enabled
        if (this.settings.voiceEnabled) {
          await this.speakResponse(response.response);
        }

        this.updateMessageCount();
      } else {
        this.displayMessage(
          "I'm having some technical difficulties, but I'm still here to support you. What's on your mind?",
          "assistant"
        );
      }
    } catch (error) {
      console.error("❌ Send message error:", error);
      this.hideLoading();
      this.displayMessage(
        "I'm having trouble right now, but I want you to know I'm here for you. Sometimes technology has hiccups, but your wellbeing matters.",
        "assistant"
      );
    }
  }

  displayMessage(message, type) {
    const messageEl = document.createElement("div");
    messageEl.className = `message ${type}`;

    const avatarEl = document.createElement("div");
    avatarEl.className = "message-avatar";

    const contentEl = document.createElement("div");
    contentEl.className = "message-content";

    const bubbleEl = document.createElement("div");
    bubbleEl.className = `message-bubble ${type}`;
    bubbleEl.textContent = message;

    const timeEl = document.createElement("div");
    timeEl.className = "message-time";
    timeEl.textContent = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Set avatar icon
    switch (type) {
      case "user":
        avatarEl.innerHTML = '<i class="fas fa-user"></i>';
        break;
      case "assistant":
        avatarEl.innerHTML = '<i class="fas fa-robot"></i>';
        break;
      case "system":
        avatarEl.innerHTML = '<i class="fas fa-info-circle"></i>';
        messageEl.style.opacity = "0.8";
        break;
    }

    contentEl.appendChild(bubbleEl);
    contentEl.appendChild(timeEl);
    messageEl.appendChild(avatarEl);
    messageEl.appendChild(contentEl);

    this.messagesContainer.appendChild(messageEl);

    // Auto scroll to bottom
    if (this.settings.autoScroll) {
      setTimeout(() => {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
      }, 100);
    }
  }

  updateStressLevel(level) {
    const stressFill = this.stressBar.querySelector(".stress-fill");
    let percentage, label, color;

    switch (level) {
      case "low":
        percentage = "25%";
        label = "Low";
        color = "var(--success-color)";
        break;
      case "moderate":
        percentage = "50%";
        label = "Moderate";
        color = "var(--warning-color)";
        break;
      case "high":
        percentage = "75%";
        label = "High";
        color = "var(--error-color)";
        break;
      case "very high":
        percentage = "95%";
        label = "Very High";
        color = "#dc2626";
        break;
      default:
        percentage = "60%";
        label = "Moderate";
        color = "var(--warning-color)";
    }

    stressFill.style.width = percentage;
    stressFill.style.background = color;
    this.stressLabel.textContent = label;
    this.stressLabel.style.color = color;
  }

  updateMessageCount() {
    this.messageCount++;
    this.messageCountEl.textContent = this.messageCount;
  }

  startSessionTimer() {
    setInterval(() => {
      const elapsed = Date.now() - this.sessionStartTime;
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      this.sessionTime.textContent = `${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }, 1000);
  }

  clearChat() {
    if (
      confirm(
        "Are you sure you want to clear the conversation? This action cannot be undone."
      )
    ) {
      this.messagesContainer.innerHTML = `
                <div class="welcome-message">
                    <div class="message-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-content">
                        <div class="message-bubble assistant">
                            <p>Hello again! I'm Luna, your AI workplace wellness companion. I understand the pressures of professional life and I'm here to support you. How can I help you today?</p>
                        </div>
                        <div class="message-time">Just now</div>
                    </div>
                </div>
            `;
      this.messageCount = 0;
      this.updateMessageCount();
      this.sessionStartTime = Date.now();
    }
  }

  openSettings() {
    this.settingsModal.classList.add("active");
    this.voiceToggle.checked = this.settings.voiceEnabled;
    this.autoScrollToggle.checked = this.settings.autoScroll;
    this.professionalNameInput.value = this.settings.professionalName;
  }

  closeSettings() {
    this.settingsModal.classList.remove("active");
  }

  async triggerBreathingExercise() {
    const message = "I'd like to do a breathing exercise to help with stress.";
    await this.handleVoiceInput(message);
  }

  async triggerStressRelief() {
    const message = "Can you give me some quick stress relief tips for work?";
    await this.handleVoiceInput(message);
  }

  async triggerWorkBalance() {
    const message = "I'm struggling with work-life balance. Can you help?";
    await this.handleVoiceInput(message);
  }

  showLoading(text = "Luna is thinking...") {
    this.loadingOverlay.classList.add("active");
    this.loadingOverlay.querySelector("p").textContent = text;
  }

  hideLoading() {
    this.loadingOverlay.classList.remove("active");
  }

  autoResizeInput() {
    this.textInput.style.height = "auto";
    this.textInput.style.height = this.textInput.scrollHeight + "px";
  }

  async makeRequest(endpoint, options = {}) {
    const defaultOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
    };

    const response = await fetch(this.baseURL + endpoint, defaultOptions);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  saveSettings() {
    localStorage.setItem("lunaSettings", JSON.stringify(this.settings));
  }

  loadSettings() {
    const saved = localStorage.getItem("lunaSettings");
    if (saved) {
      this.settings = { ...this.settings, ...JSON.parse(saved) };
    }
  }

  updateUI() {
    // Update UI based on settings
    if (this.voiceToggle) {
      this.voiceToggle.checked = this.settings.voiceEnabled;
    }
    if (this.autoScrollToggle) {
      this.autoScrollToggle.checked = this.settings.autoScroll;
    }
    if (this.professionalNameInput) {
      this.professionalNameInput.value = this.settings.professionalName;
    }
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Luna Professional Assistant starting...");
  window.lunaAssistant = new LunaProfessionalAssistant();
  console.log("✅ Luna Professional Assistant initialized");
});

// Global functions for HTML buttons
window.startLunaChat = () => {
  if (window.lunaAssistant) {
    window.lunaAssistant.startListening();
  }
};

window.stopLunaChat = () => {
  if (window.lunaAssistant) {
    window.lunaAssistant.stopListening();
    window.lunaAssistant.stopSpeaking();
  }
};

// Handle page visibility changes
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    console.log("🔇 Page hidden - pausing Luna");
  } else {
    console.log("🔊 Page visible - resuming Luna");
    // Reconnect if needed
    if (window.lunaAssistant && !window.lunaAssistant.isConnected) {
      window.lunaAssistant.connectToLuna();
    }
  }
});

// Handle network changes
window.addEventListener("online", () => {
  console.log("🌐 Network online - reconnecting Luna");
  if (window.lunaAssistant) {
    window.lunaAssistant.connectToLuna();
  }
});

window.addEventListener("offline", () => {
  console.log("📡 Network offline");
  if (window.lunaAssistant) {
    window.lunaAssistant.updateConnectionStatus("Offline", false);
  }
});

// Error handling
window.addEventListener("error", (e) => {
  console.error("🚨 Global error:", e.error);
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("🚨 Unhandled promise rejection:", e.reason);
});
