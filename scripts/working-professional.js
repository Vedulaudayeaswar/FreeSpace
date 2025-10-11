class LunaVoiceAssistant {
  constructor() {
    this.recognition = null;
    this.synth = window.speechSynthesis;
    this.isListening = false;
    this.isSpeaking = false;
    this.conversationHistory = [];
    this.retryCount = 0;
    this.maxRetries = 3;
    this.backendUrl =
      window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : window.location.origin;

    this.init();
  }

  async init() {
    console.log("🤖 Initializing Luna...");

    if (location.protocol !== "https:" && location.hostname !== "localhost") {
      this.showError("Speech features require HTTPS connection");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.showError("Speech recognition not supported in this browser");
      return;
    }

    this.recognition = new SpeechRecognition();
    this.setupRecognition();

    await this.checkMicrophonePermissions();
    await this.initializeBackend();

    console.log("✅ Luna initialized successfully");
    this.updateStatus("Luna is ready for professional wellness support! 🌙");
    this.enableTalkButton();
  }

  setupRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = "en-US";
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      console.log("🎤 Listening...");
      this.isListening = true;
      this.retryCount = 0;
      this.updateTalkButton("Listening...", true);
    };

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log("Professional said:", transcript);
      this.processUserInput(transcript);
    };

    this.recognition.onerror = (event) => {
      console.log("Speech recognition error:", event.error);
      this.handleRecognitionError(event.error);
    };

    this.recognition.onend = () => {
      console.log("🔇 Speech recognition ended");
      this.isListening = false;
      this.updateTalkButton("Hold to Talk", false);
    };
  }

  handleRecognitionError(error) {
    switch (error) {
      case "network":
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          setTimeout(() => {
            if (!this.isListening && navigator.onLine) {
              this.startListening();
            }
          }, 2000 * this.retryCount);
        } else {
          this.showError("Network connection issue. Please try again.");
          this.retryCount = 0;
        }
        break;

      case "not-allowed":
        this.showError("Please allow microphone access and refresh the page.");
        break;

      case "no-speech":
        console.log("No speech detected");
        break;

      default:
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          setTimeout(() => this.startListening(), 1000);
        }
    }
  }

  async checkMicrophonePermissions() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      this.showError("Please allow microphone access");
      return false;
    }
  }

  async initializeBackend() {
    try {
      const response = await fetch(
        `${this.backendUrl}/api/working-professional/start-conversation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      return response.ok;
    } catch (error) {
      console.log("Backend fallback mode");
      return false;
    }
  }

  startListening() {
    if (!this.recognition || this.isListening || !navigator.onLine) return;

    try {
      this.recognition.start();
    } catch (error) {
      console.log("Error starting recognition:", error);
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  async processUserInput(transcript) {
    this.addMessage(transcript, "user");
    this.updateStatus("Luna is analyzing...");

    try {
      const response = await fetch(
        `${this.backendUrl}/api/working-professional/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: transcript,
            conversation_history: this.conversationHistory,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const aiResponse =
          data.response || "I'm here to support your professional wellness.";
        this.addMessage(aiResponse, "ai");
        this.speakResponse(aiResponse);
      } else {
        throw new Error("Backend error");
      }
    } catch (error) {
      const fallbackResponse = this.getProfessionalFallbackResponse(transcript);
      this.addMessage(fallbackResponse, "ai");
      this.speakResponse(fallbackResponse);
    }

    this.updateStatus("Luna is ready for professional wellness support! 🌙");
  }

  getProfessionalFallbackResponse(message) {
    const responses = [
      "Work-life balance is crucial. What specific challenges are you facing in your professional life?",
      "Workplace stress is common. Can you tell me more about what's causing pressure right now?",
      "Professional burnout is real. What symptoms are you experiencing?",
      "Managing work relationships can be complex. What situation would you like to discuss?",
      "Career transitions bring unique challenges. How can I support you through this?",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  speakResponse(text) {
    if (this.isSpeaking) this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 0.9;
    utterance.volume = 0.8;

    utterance.onstart = () => (this.isSpeaking = true);
    utterance.onend = () => (this.isSpeaking = false);

    this.synth.speak(utterance);
  }

  addMessage(text, sender) {
    const chatMessages = document.getElementById("chatMessages");
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}-message`;

    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas ${sender === "user" ? "fa-user" : "fa-moon"}"></i>
            </div>
            <div class="message-content">
                <p>${text}</p>
                <div class="message-time">${time}</div>
            </div>
        `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    this.conversationHistory.push({
      text: text,
      sender: sender,
      timestamp: new Date().toISOString(),
    });
  }

  updateStatus(status) {
    const statusElement = document.getElementById("connectionStatus");
    if (statusElement) statusElement.textContent = status;
  }

  updateTalkButton(text, active) {
    const talkButton = document.getElementById("talkButton");
    const buttonText = talkButton?.querySelector("span");
    if (buttonText) buttonText.textContent = text;
    talkButton?.classList.toggle("listening", active);
  }

  enableTalkButton() {
    const talkButton = document.getElementById("talkButton");
    if (talkButton) talkButton.disabled = false;
  }

  showError(message) {
    console.error("Error:", message);
    this.updateStatus(`Error: ${message}`);
  }
}

// Initialize Luna
document.addEventListener("DOMContentLoaded", function () {
  const luna = new LunaVoiceAssistant();

  const talkButton = document.getElementById("talkButton");
  const stopButton = document.getElementById("stopButton");

  if (talkButton) {
    talkButton.addEventListener("mousedown", () => luna.startListening());
    talkButton.addEventListener("mouseup", () => luna.stopListening());
    talkButton.addEventListener("touchstart", () => luna.startListening());
    talkButton.addEventListener("touchend", () => luna.stopListening());
  }

  if (stopButton) {
    stopButton.addEventListener("click", () => {
      luna.stopListening();
      luna.synth.cancel();
    });
  }

  document.querySelectorAll(".quick-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const response = button.getAttribute("data-response");
      if (response) luna.processUserInput(response);
    });
  });
});
