document.addEventListener("DOMContentLoaded", function () {
  console.log("Maya Voice Assistant loading...");

  // Configuration - Updated for production
  const BACKEND_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://127.0.0.1:5000/api"
      : "https://freespace-ai-platform.onrender.com/api";

  // DOM Elements
  const chatMessages = document.getElementById("chatMessages");
  const talkButton = document.getElementById("talkButton");
  const stopButton = document.getElementById("stopButton");
  const connectionStatus = document.getElementById("connectionStatus");
  const quickBtns = document.querySelectorAll(".quick-btn");

  // Voice State
  let recognition = null;
  let synthesis = window.speechSynthesis;
  let mayaVoice = null;
  let isListening = false;
  let isSpeaking = false;
  let isConnected = false;

  // Initialize Voice Services
  function initVoiceServices() {
    // Speech Recognition Setup
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        console.log("🎤 Listening started...");
        updateStatus("Listening...", "listening");
        if (talkButton) {
          talkButton.innerHTML =
            '<i class="fas fa-microphone-alt"></i> Listening...';
          talkButton.classList.add("listening");
        }
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log("📝 You said:", transcript);
        handleVoiceInput(transcript);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        updateStatus("Voice error - try again", "error");
        stopListening();
      };

      recognition.onend = () => {
        stopListening();
      };
    }

    // Speech Synthesis Setup
    if (synthesis) {
      // Wait for voices to load
      const loadVoices = () => {
        const voices = synthesis.getVoices();
        // Find a female voice for Maya
        mayaVoice =
          voices.find(
            (voice) =>
              voice.name.includes("Zira") ||
              voice.name.includes("Female") ||
              voice.name.toLowerCase().includes("female")
          ) || voices[0];

        console.log("🎭 Maya voice selected:", mayaVoice?.name || "Default");
      };

      if (synthesis.getVoices().length === 0) {
        synthesis.onvoiceschanged = loadVoices;
      } else {
        loadVoices();
      }
    }
  }

  // Start Listening Function
  function startListening() {
    if (!recognition) {
      alert("Speech recognition not supported. Please use Chrome or Edge.");
      return;
    }

    if (isListening) return;

    stopSpeaking(); // Stop any current speech

    try {
      isListening = true;
      recognition.start();
    } catch (error) {
      console.error("Error starting recognition:", error);
      isListening = false;
    }
  }

  // Stop Listening Function
  function stopListening() {
    isListening = false;

    if (recognition) {
      recognition.stop();
    }

    if (talkButton) {
      talkButton.innerHTML = '<i class="fas fa-microphone"></i> Hold to Talk';
      talkButton.classList.remove("listening");
    }

    updateStatus("Maya is ready to listen 💙", "ready");
  }

  // Handle Voice Input
  async function handleVoiceInput(transcript) {
    try {
      // Add user message to chat
      addMessage(transcript, "user");
      updateStatus("Maya is thinking...", "thinking");

      // Send to backend
      const response = await fetch(`${BACKEND_URL}/student/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: transcript }),
      });

      const data = await response.json();

      if (data.success && data.response) {
        // Add Maya's response to chat
        addMessage(data.response, "ai");

        // Speak Maya's response using browser TTS
        await speakResponse(data.response);
      } else {
        const fallback = "I'm here for you. Can you tell me more?";
        addMessage(fallback, "ai");
        await speakResponse(fallback);
      }
    } catch (error) {
      console.error("Error handling voice input:", error);
      const errorMsg =
        "I'm having some technical difficulties, but I'm still here to listen.";
      addMessage(errorMsg, "ai");
      await speakResponse(errorMsg);
    }
  }

  // Speak Response Function
  async function speakResponse(text) {
    return new Promise((resolve) => {
      if (!synthesis || isSpeaking) {
        resolve();
        return;
      }

      // Stop any current speech
      synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      if (mayaVoice) {
        utterance.voice = mayaVoice;
      }

      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.volume = 0.8;

      utterance.onstart = () => {
        isSpeaking = true;
        updateStatus("🗣️ Maya is speaking...", "speaking");
        console.log("🗣️ Maya is speaking...");
      };

      utterance.onend = () => {
        isSpeaking = false;
        updateStatus("Maya is ready to listen 💙", "ready");
        console.log("✅ Maya finished speaking");
        resolve();
      };

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event.error);
        isSpeaking = false;
        updateStatus("Voice error occurred", "error");
        resolve();
      };

      synthesis.speak(utterance);
    });
  }

  // Stop Speaking Function
  function stopSpeaking() {
    if (synthesis) {
      synthesis.cancel();
      isSpeaking = false;
      updateStatus("Maya is ready to listen 💙", "ready");
    }
  }

  // Update Status Function
  function updateStatus(message, type = "ready") {
    if (connectionStatus) {
      connectionStatus.textContent = message;
      connectionStatus.className = `status ${type}`;
    }
  }

  // Add Message to Chat
  function addMessage(message, type) {
    if (!chatMessages) return;

    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${type}-message`;

    const avatarDiv = document.createElement("div");
    avatarDiv.className = "message-avatar";

    if (type === "user") {
      avatarDiv.innerHTML = '<i class="fas fa-user"></i>';
    } else {
      avatarDiv.innerHTML = '<i class="fas fa-heart"></i>';
    }

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";

    const messageP = document.createElement("p");
    messageP.textContent = message;

    const timestamp = document.createElement("div");
    timestamp.className = "message-time";
    timestamp.textContent = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    contentDiv.appendChild(messageP);
    contentDiv.appendChild(timestamp);
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Initialize Connection - Updated URL
  async function initializeConnection() {
    try {
      updateStatus("Connecting to Maya...", "connecting");

      // Test backend connection - Updated URL
      const testResponse = await fetch(BACKEND_URL.replace("/api", "/"));
      if (!testResponse.ok) throw new Error("Backend not running");

      // Start conversation
      const response = await fetch(
        `${BACKEND_URL}/student/start-conversation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: "Student", happiness: 50 }),
        }
      );

      const data = await response.json();

      if (data.success) {
        isConnected = true;
        updateStatus("Maya is ready to listen 💙", "ready");

        if (talkButton) talkButton.disabled = false;

        // Maya's welcome message
        const welcomeMsg =
          data.message ||
          "Hi! I'm Maya, your AI friend. I'm here to listen to you. Click 'Hold to Talk' to start our conversation.";
        addMessage(welcomeMsg, "ai");
        await speakResponse(welcomeMsg);

        console.log("✅ Maya initialized successfully");
      }
    } catch (error) {
      console.error("Connection error:", error);
      updateStatus("Connection failed - Check if backend is running", "error");
    }
  }

  class MayaVoiceAssistant {
    constructor() {
      this.recognition = null;
      this.synth = window.speechSynthesis;
      this.isListening = false;
      this.isSpeaking = false;
      this.conversationHistory = [];
      this.retryCount = 0;
      this.maxRetries = 3;
      // Update for Render deployment
      this.backendUrl =
        window.location.hostname === "localhost"
          ? "http://localhost:5000"
          : window.location.origin; // Use same origin for Render

      this.init();
    }

    async init() {
      console.log("🤖 Initializing Maya...");

      // Check for HTTPS (Render provides HTTPS by default)
      if (location.protocol !== "https:" && location.hostname !== "localhost") {
        console.error("❌ Speech Recognition requires HTTPS");
        this.showError("Speech features require HTTPS connection");
        return;
      }

      // Check speech recognition support
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.error("❌ Speech Recognition not supported");
        this.showError("Speech recognition not supported in this browser");
        return;
      }

      this.recognition = new SpeechRecognition();
      this.setupRecognition();

      await this.checkMicrophonePermissions();
      await this.initializeBackend();

      console.log("✅ Maya initialized successfully");
      this.updateStatus("Maya is ready to listen! 💙");
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
        console.log("User said:", transcript);
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
      console.log(`Speech recognition error: ${error}`);

      switch (error) {
        case "network":
          if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            console.log(
              `Network error - retry attempt ${this.retryCount}/${this.maxRetries}`
            );
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
          this.showError(
            "Please allow microphone access and refresh the page."
          );
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
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
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
          `${this.backendUrl}/api/student/start-conversation`,
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
      this.updateStatus("Maya is thinking...");

      try {
        const response = await fetch(`${this.backendUrl}/api/student/respond`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: transcript,
            conversation_history: this.conversationHistory,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const aiResponse = data.response || "I'm here to support you.";
          this.addMessage(aiResponse, "ai");
          this.speakResponse(aiResponse);
        } else {
          throw new Error("Backend error");
        }
      } catch (error) {
        const fallbackResponse = this.getFallbackResponse(transcript);
        this.addMessage(fallbackResponse, "ai");
        this.speakResponse(fallbackResponse);
      }

      this.updateStatus("Maya is ready to listen! 💙");
    }

    getFallbackResponse(message) {
      const responses = [
        "I hear you, and your feelings are valid. Tell me more about what's going on?",
        "Thank you for sharing. It sounds difficult. I'm here to listen.",
        "You're brave for reaching out. What would help you right now?",
        "I'm glad you feel comfortable talking to me. Your wellbeing matters.",
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    speakResponse(text) {
      if (this.isSpeaking) this.synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
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
                <i class="fas ${
                  sender === "user" ? "fa-user" : "fa-heart"
                }"></i>
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

  // Initialize Maya
  document.addEventListener("DOMContentLoaded", function () {
    const maya = new MayaVoiceAssistant();

    const talkButton = document.getElementById("talkButton");
    const stopButton = document.getElementById("stopButton");

    if (talkButton) {
      talkButton.addEventListener("mousedown", () => maya.startListening());
      talkButton.addEventListener("mouseup", () => maya.stopListening());
      talkButton.addEventListener("touchstart", () => maya.startListening());
      talkButton.addEventListener("touchend", () => maya.stopListening());
    }

    if (stopButton) {
      stopButton.addEventListener("click", () => {
        maya.stopListening();
        maya.synth.cancel();
      });
    }

    // Quick response buttons
    document.querySelectorAll(".quick-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const response = button.getAttribute("data-response");
        if (response) maya.processUserInput(response);
      });
    });
  });

  // Event Listeners
  if (talkButton) {
    talkButton.addEventListener("click", startListening);
  }

  if (stopButton) {
    stopButton.addEventListener("click", () => {
      stopListening();
      stopSpeaking();
    });
  }

  // Quick response buttons
  quickBtns.forEach((btn) => {
    btn.addEventListener("click", async function () {
      const response = this.getAttribute("data-response");
      await handleVoiceInput(response);
    });
  });

  // Home button
  document.querySelector(".home-btn").addEventListener("click", () => {
    window.location.href = "who-are-you.html"; // Changed from 'index.html'
  });

  // Global functions for HTML buttons
  window.startVoiceChat = startListening;
  window.stopVoiceChat = () => {
    stopListening();
    stopSpeaking();
  };

  window.stopMayaSpeaking = stopSpeaking;

  // Initialize everything
  initVoiceServices();
  initializeConnection();
});
