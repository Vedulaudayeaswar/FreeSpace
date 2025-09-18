document.addEventListener("DOMContentLoaded", function () {
  console.log("Maya Voice Assistant loading...");

  // Configuration
  const BACKEND_URL = "http://127.0.0.1:5000/api";

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

  // Initialize Connection
  async function initializeConnection() {
    try {
      updateStatus("Connecting to Maya...", "connecting");

      // Test backend connection
      const testResponse = await fetch("http://127.0.0.1:5000/");
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
