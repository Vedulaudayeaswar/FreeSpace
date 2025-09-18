// Zen Mode Advanced Meditation Experience
class ZenMeditationSpace {
  constructor() {
    this.currentExercise = "breathing-478";
    this.isRunning = false;
    this.isPaused = false;
    this.currentTime = 0;
    this.totalTime = 300; // 5 minutes default
    this.currentStep = 0;
    this.breathCount = 0;
    this.maxBreaths = 10;
    this.audioPath = "";
    this.audioVolume = 0.5;
    this.meditationAudio = null;
    this.bellSound = null;
    this.backgroundAudio = null; // New: For nature sounds
    this.currentBackgroundSound = 'none';

    // Breathing patterns (inhale-hold-exhale-pause in seconds)
    this.breathingPatterns = {
      "4-7-8-0": {
        inhale: 4,
        hold: 7,
        exhale: 8,
        pause: 0,
        name: "4-7-8 Relaxing",
      },
      "4-4-4-4": {
        inhale: 4,
        hold: 4,
        exhale: 4,
        pause: 4,
        name: "Box Breathing",
      },
      "6-6-6-6": {
        inhale: 6,
        hold: 6,
        exhale: 6,
        pause: 6,
        name: "Deep Breathing",
      },
      "4-4-6-2": {
        inhale: 4,
        hold: 4,
        exhale: 6,
        pause: 2,
        name: "Triangle Breathing",
      },
    };

    // Background sound paths
    this.backgroundSounds = {
      'none': null,
      'nature': 'audio/nature.m4a',
      'rain': 'audio/rain.m4a',
      'ocean': 'audio/ocean.m4a',
      'forest': 'audio/forest.m4a'
    };

    this.currentPattern = this.breathingPatterns["4-7-8-0"];
    this.breathPhase = "prepare"; // prepare, inhale, hold, exhale, pause
    this.phaseTimer = 0;

    // Exercise definitions
    this.exercises = {
      "breathing-478": {
        name: "4-7-8 Breathing Exercise",
        duration: 300,
        type: "breathing",
        instructions: [
          "Sit comfortably with your back straight and feet flat on the floor",
          "Place one hand on your chest and one on your belly",
          "Breathe in through your nose for 4 counts",
          "Hold your breath for 7 counts",
          "Exhale through your mouth for 8 counts",
        ],
        benefits: "Reduces anxiety, promotes sleep, helps manage stress",
      },
      "box-breathing": {
        name: "Box Breathing",
        duration: 300,
        type: "breathing",
        instructions: [
          "Sit in a comfortable position with your spine straight",
          "Exhale completely through your mouth",
          "Breathe in through your nose for 4 counts",
          "Hold your breath for 4 counts",
          "Exhale through your mouth for 4 counts",
          "Hold empty for 4 counts",
        ],
        benefits: "Improves focus, reduces stress, enhances performance",
      },
      "triangle-breathing": {
        name: "Triangle Breathing",
        duration: 360,
        type: "breathing",
        instructions: [
          "Find a comfortable seated position",
          "Breathe in slowly for 4 counts",
          "Hold the breath for 4 counts",
          "Exhale slowly for 6 counts",
          "Brief pause before next cycle",
        ],
        benefits: "Balances energy, calms the mind, improves concentration",
      },
      "mindful-awareness": {
        name: "Mindful Awareness",
        duration: 600,
        type: "mindfulness",
        instructions: [
          "Sit comfortably and close your eyes",
          "Notice your breath without changing it",
          "When thoughts arise, acknowledge them gently",
          "Return your attention to your breath",
          "Stay present in this moment",
        ],
        benefits:
          "Increases awareness, reduces rumination, improves emotional regulation",
      },
      "loving-kindness": {
        name: "Loving Kindness Meditation",
        duration: 720,
        type: "mindfulness",
        instructions: [
          "Sit quietly and bring yourself to mind",
          "Send loving thoughts to yourself",
          "Extend love to someone close to you",
          "Include someone neutral in your life",
          "Send love to someone difficult",
          "Extend love to all beings everywhere",
        ],
        benefits:
          "Increases compassion, reduces negative emotions, improves relationships",
      },
      "walking-meditation": {
        name: "Walking Meditation",
        duration: 900,
        type: "mindfulness",
        instructions: [
          "Find a quiet path 10-20 steps long",
          "Walk slowly and deliberately",
          "Focus on the sensation of each step",
          "When you reach the end, pause and turn",
          "Continue walking mindfully back and forth",
        ],
        benefits:
          "Combines movement with mindfulness, grounds you in the present",
      },
      "body-scan": {
        name: "Progressive Body Scan",
        duration: 900,
        type: "relaxation",
        instructions: [
          "Lie down comfortably on your back",
          "Start by noticing your toes",
          "Slowly move attention up through your body",
          "Notice each part without judgment",
          "Release tension as you scan each area",
          "End with awareness of your whole body",
        ],
        benefits:
          "Releases physical tension, improves body awareness, promotes deep relaxation",
      },
      "muscle-relaxation": {
        name: "Progressive Muscle Relaxation",
        duration: 1200,
        type: "relaxation",
        instructions: [
          "Lie down in a comfortable position",
          "Tense your toes for 5 seconds, then relax",
          "Move up through each muscle group",
          "Tense and release: calves, thighs, glutes",
          "Continue with arms, shoulders, face",
          "Notice the contrast between tension and relaxation",
        ],
        benefits: "Reduces physical tension, improves sleep, decreases anxiety",
      },
      "yoga-nidra": {
        name: "Yoga Nidra",
        duration: 1500,
        type: "relaxation",
        instructions: [
          "Lie down in savasana position",
          "Set a positive intention (sankalpa)",
          "Systematically relax each body part",
          "Visualize peaceful images",
          "Rest in the space between waking and sleeping",
          "Return to your intention before finishing",
        ],
        benefits: "Profound relaxation, reduces stress, improves sleep quality",
      },
      "peaceful-place": {
        name: "Peaceful Place Visualization",
        duration: 720,
        type: "visualization",
        instructions: [
          "Close your eyes and breathe deeply",
          "Imagine a place where you feel completely safe",
          "See the colors, hear the sounds, feel the textures",
          "Notice how peaceful and calm you feel here",
          "Know you can return to this place anytime",
        ],
        benefits: "Creates inner sanctuary, reduces anxiety, improves mood",
      },
      "light-meditation": {
        name: "Golden Light Meditation",
        duration: 1080,
        type: "visualization",
        instructions: [
          "Sit comfortably and close your eyes",
          "Imagine warm golden light above your head",
          "See the light slowly entering the top of your head",
          "Feel it filling your entire body with warmth",
          "Let the light heal and energize every cell",
          "Rest in this golden glow",
        ],
        benefits:
          "Increases positive energy, promotes healing, enhances well-being",
      },
      "chakra-visualization": {
        name: "Chakra Journey",
        duration: 1800,
        type: "visualization",
        instructions: [
          "Sit in meditation posture",
          "Begin at the root chakra (base of spine)",
          "Visualize red light spinning at the base",
          "Move up through each chakra color",
          "Orange (sacral), Yellow (solar), Green (heart)",
          "Blue (throat), Indigo (third eye), Violet (crown)",
          "Feel the energy flow and balance",
        ],
        benefits:
          "Balances energy centers, promotes spiritual well-being, enhances intuition",
      },
      "quick-calm": {
        name: "Quick Calm",
        duration: 120,
        type: "breathing",
        instructions: [
          "Take three deep breaths",
          "Release tension in your shoulders",
          "Focus on the present moment",
          "Let go of stress and worry",
        ],
        benefits: "Instant stress relief, quick reset",
      },
      "stress-release": {
        name: "Stress Release",
        duration: 180,
        type: "relaxation",
        instructions: [
          "Close your eyes and breathe naturally",
          "Scan your body for tension",
          "Breathe into tense areas",
          "Release on each exhale",
          "Let stress melt away",
        ],
        benefits: "Reduces physical tension, calms the mind",
      },
    };

    // Timer and animation intervals
    this.sessionTimer = null;
    this.breathingTimer = null;
    this.animationFrame = null;

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupAudio();
    this.updateDisplay();
    this.displayExercise(this.currentExercise);
  }

  setupEventListeners() {
    // Exercise selection
    document.querySelectorAll(".exercise-card").forEach((card) => {
      card.addEventListener("click", () => {
        const exerciseId = card.dataset.exercise;
        this.selectExercise(exerciseId);
      });
    });

    // Control buttons
    document.getElementById("playPauseBtn").addEventListener("click", () => {
      this.togglePlayPause();
    });

    document.getElementById("resetBtn").addEventListener("click", () => {
      this.resetSession();
    });

    document.getElementById("prevBtn").addEventListener("click", () => {
      this.previousStep();
    });

    document.getElementById("nextBtn").addEventListener("click", () => {
      this.nextStep();
    });

    // Settings
    document
      .getElementById("sessionDuration")
      .addEventListener("change", (e) => {
        this.totalTime = parseInt(e.target.value) * 60;
        this.currentTime = this.totalTime;
        this.updateDisplay();
      });

    document
      .getElementById("breathingRatio")
      .addEventListener("change", (e) => {
        this.currentPattern = this.breathingPatterns[e.target.value];
      });

    // Background sounds selection
    document
      .getElementById("backgroundSounds")
      .addEventListener("change", (e) => {
        this.changeBackgroundSound(e.target.value);
      });

    // Audio settings
    document.getElementById("audioToggle").addEventListener("click", () => {
      this.toggleAudioPanel();
    });

    document.getElementById("audioPath").addEventListener("input", (e) => {
      this.audioPath = e.target.value;
    });

    document.getElementById("testAudio").addEventListener("click", () => {
      this.testAudio();
    });

    document.getElementById("volumeSlider").addEventListener("input", (e) => {
      this.audioVolume = e.target.value / 100;
      document.getElementById("volumeValue").textContent = e.target.value + "%";
      if (this.meditationAudio) {
        this.meditationAudio.volume = this.audioVolume;
      }
      if (this.backgroundAudio) {
        this.backgroundAudio.volume = this.audioVolume * 0.7; // Background sounds slightly quieter
      }
    });

    // Preset buttons
    document.querySelectorAll(".preset-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const path = e.target.dataset.path;
        document.getElementById("audioPath").value = path;
        this.audioPath = path;
      });
    });

    // Modal controls
    document.getElementById("closeModal").addEventListener("click", () => {
      this.closeCompletionModal();
    });

    document.getElementById("sessionAgain").addEventListener("click", () => {
      this.closeCompletionModal();
      this.resetSession();
    });

    document.getElementById("closeZen").addEventListener("click", () => {
      this.exitZenMode();
    });
  }

  setupAudio() {
    this.meditationAudio = document.getElementById("meditationAudio");
    this.bellSound = document.getElementById("bellSound");
    this.backgroundAudio = document.getElementById("backgroundAudio");

    if (this.meditationAudio) {
      this.meditationAudio.volume = this.audioVolume;
    }

    if (this.backgroundAudio) {
      this.backgroundAudio.volume = this.audioVolume * 0.7; // Background sounds slightly quieter
      this.backgroundAudio.loop = true;
    }
  }

  changeBackgroundSound(soundType) {
    this.currentBackgroundSound = soundType;
    
    // Stop current background audio
    if (this.backgroundAudio) {
      this.backgroundAudio.pause();
      this.backgroundAudio.currentTime = 0;
    }

    // If 'none' is selected, just stop the audio
    if (soundType === 'none') {
      return;
    }

    // Set new background sound
    const audioPath = this.backgroundSounds[soundType];
    if (audioPath && this.backgroundAudio) {
      this.backgroundAudio.src = audioPath;
      
      // If session is running, start playing the background sound
      if (this.isRunning) {
        this.backgroundAudio.play().catch(e => {
          console.log('Background audio play failed:', e);
          // Fallback: show user-friendly message
          this.showAudioMessage(`Could not play ${soundType} sounds. Please check if the audio file exists.`);
        });
      }
    }
  }

  showAudioMessage(message) {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.className = 'audio-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--zen-primary);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 1001;
      animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }

  selectExercise(exerciseId) {
    // Remove active class from all cards
    document.querySelectorAll(".exercise-card").forEach((card) => {
      card.classList.remove("active");
    });

    // Add active class to selected card
    const selectedCard = document.querySelector(
      `[data-exercise="${exerciseId}"]`
    );
    if (selectedCard) {
      selectedCard.classList.add("active");
    }

    this.currentExercise = exerciseId;
    this.resetSession();
    this.displayExercise(exerciseId);
  }

  displayExercise(exerciseId) {
    const exercise = this.exercises[exerciseId];
    if (!exercise) return;

    // Update title
    document.getElementById("exerciseTitle").textContent = exercise.name;

    // Update instructions
    const stepsContainer = document.getElementById("instructionSteps");
    stepsContainer.innerHTML = "";

    exercise.instructions.forEach((instruction, index) => {
      const stepDiv = document.createElement("div");
      stepDiv.className = "step";
      if (index === 0) stepDiv.classList.add("active");

      stepDiv.innerHTML = `
                <div class="step-number">${index + 1}</div>
                <p>${instruction}</p>
            `;

      stepsContainer.appendChild(stepDiv);
    });

    // Update duration
    this.totalTime = exercise.duration;
    this.currentTime = this.totalTime;
    this.updateDisplay();
  }

  togglePlayPause() {
    if (this.isRunning) {
      this.pauseSession();
    } else {
      this.startSession();
    }
  }

  startSession() {
    this.isRunning = true;
    this.isPaused = false;

    // Update button
    const playBtn = document.getElementById("playPauseBtn");
    playBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';

    // Start meditation audio if available
    if (this.audioPath && this.meditationAudio) {
      this.meditationAudio.src = this.audioPath;
      this.meditationAudio
        .play()
        .catch((e) => console.log("Meditation audio play failed:", e));
    }

    // Start background sounds if selected
    if (this.currentBackgroundSound !== 'none' && this.backgroundAudio) {
      const audioPath = this.backgroundSounds[this.currentBackgroundSound];
      if (audioPath) {
        this.backgroundAudio.src = audioPath;
        this.backgroundAudio.play().catch(e => {
          console.log('Background audio play failed:', e);
          this.showAudioMessage(`Could not play ${this.currentBackgroundSound} sounds.`);
        });
      }
    }

    // Play bell sound
    if (this.bellSound) {
      this.bellSound.play().catch((e) => console.log("Bell sound failed:", e));
    }

    // Start appropriate timer based on exercise type
    const exercise = this.exercises[this.currentExercise];
    if (exercise.type === "breathing") {
      this.startBreathingSession();
    } else {
      this.startRegularSession();
    }
  }

  pauseSession() {
    this.isRunning = false;
    this.isPaused = true;

    // Update button
    const playBtn = document.getElementById("playPauseBtn");
    playBtn.innerHTML = '<i class="fas fa-play"></i> Resume';

    // Pause all audio
    if (this.meditationAudio) {
      this.meditationAudio.pause();
    }

    if (this.backgroundAudio) {
      this.backgroundAudio.pause();
    }

    // Clear timers
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
    }
    if (this.breathingTimer) {
      clearInterval(this.breathingTimer);
    }
  }

  startBreathingSession() {
    this.breathPhase = "prepare";
    this.phaseTimer = 0;
    this.breathCount = 0;

    document.getElementById("timerLabel").textContent = "Prepare to breathe...";

    // Start breathing cycle
    this.breathingTimer = setInterval(() => {
      this.updateBreathingCycle();
    }, 1000);

    // Start main session timer
    this.sessionTimer = setInterval(() => {
      this.currentTime--;
      this.updateDisplay();

      if (this.currentTime <= 0) {
        this.completeSession();
      }
    }, 1000);
  }

  startRegularSession() {
    this.sessionTimer = setInterval(() => {
      this.currentTime--;
      this.updateDisplay();

      if (this.currentTime <= 0) {
        this.completeSession();
      }
    }, 1000);

    // Update labels for non-breathing exercises
    document.getElementById("timerLabel").textContent =
      "Meditation in progress...";
    document.getElementById("breathCount").textContent = "";
  }

  updateBreathingCycle() {
    if (!this.isRunning) return;

    const pattern = this.currentPattern;
    const timerCircle = document.getElementById("timerCircle");
    const timerLabel = document.getElementById("timerLabel");
    const breathCountDisplay = document.getElementById("breathCount");

    switch (this.breathPhase) {
      case "prepare":
        if (this.phaseTimer >= 3) {
          this.breathPhase = "inhale";
          this.phaseTimer = 0;
          this.breathCount++;
        }
        timerLabel.textContent = "Prepare to breathe...";
        break;

      case "inhale":
        timerCircle.className = "timer-circle breathe-in";
        timerLabel.textContent = `Breathe in... ${
          pattern.inhale - this.phaseTimer
        }`;

        if (this.phaseTimer >= pattern.inhale) {
          this.breathPhase = pattern.hold > 0 ? "hold" : "exhale";
          this.phaseTimer = 0;
        }
        break;

      case "hold":
        timerCircle.className = "timer-circle breathe-hold";
        timerLabel.textContent = `Hold... ${pattern.hold - this.phaseTimer}`;

        if (this.phaseTimer >= pattern.hold) {
          this.breathPhase = "exhale";
          this.phaseTimer = 0;
        }
        break;

      case "exhale":
        timerCircle.className = "timer-circle breathe-out";
        timerLabel.textContent = `Breathe out... ${
          pattern.exhale - this.phaseTimer
        }`;

        if (this.phaseTimer >= pattern.exhale) {
          this.breathPhase = pattern.pause > 0 ? "pause" : "inhale";
          this.phaseTimer = 0;
          if (this.breathPhase === "inhale") {
            this.breathCount++;
          }
        }
        break;

      case "pause":
        timerCircle.className = "timer-circle";
        timerLabel.textContent = `Pause... ${pattern.pause - this.phaseTimer}`;

        if (this.phaseTimer >= pattern.pause) {
          this.breathPhase = "inhale";
          this.phaseTimer = 0;
          this.breathCount++;
        }
        break;
    }

    breathCountDisplay.textContent = `Breath ${this.breathCount}`;
    this.phaseTimer++;
  }

  resetSession() {
    this.isRunning = false;
    this.isPaused = false;
    this.currentTime = this.totalTime;
    this.currentStep = 0;
    this.breathCount = 0;
    this.breathPhase = "prepare";
    this.phaseTimer = 0;

    // Clear timers
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
    }
    if (this.breathingTimer) {
      clearInterval(this.breathingTimer);
    }

    // Stop all audio
    if (this.meditationAudio) {
      this.meditationAudio.pause();
      this.meditationAudio.currentTime = 0;
    }

    if (this.backgroundAudio) {
      this.backgroundAudio.pause();
      this.backgroundAudio.currentTime = 0;
    }

    // Reset UI
    const playBtn = document.getElementById("playPauseBtn");
    playBtn.innerHTML = '<i class="fas fa-play"></i> Start Session';

    document.getElementById("timerLabel").textContent = "Ready to begin...";
    document.getElementById("breathCount").textContent = "";
    document.getElementById("timerCircle").className = "timer-circle";

    this.updateDisplay();
    this.updateStepHighlight();
  }

  completeSession() {
    this.isRunning = false;

    // Clear timers
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
    }
    if (this.breathingTimer) {
      clearInterval(this.breathingTimer);
    }

    // Stop all audio
    if (this.meditationAudio) {
      this.meditationAudio.pause();
    }

    if (this.backgroundAudio) {
      this.backgroundAudio.pause();
    }

    // Play completion bell
    if (this.bellSound) {
      this.bellSound.play().catch((e) => console.log("Bell sound failed:", e));
    }

    // Show completion modal
    this.showCompletionModal();
  }

  showCompletionModal() {
    const modal = document.getElementById("completionModal");
    const completedTime = Math.ceil((this.totalTime - this.currentTime) / 60);
    const completedBreaths = this.breathCount;

    document.getElementById("completedTime").textContent = completedTime;
    document.getElementById("completedBreaths").textContent = completedBreaths;

    modal.classList.add("active");
  }

  closeCompletionModal() {
    document.getElementById("completionModal").classList.remove("active");
  }

  updateDisplay() {
    const minutes = Math.floor(this.currentTime / 60);
    const seconds = this.currentTime % 60;
    const timeString = `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;

    document.getElementById("timeDisplay").textContent = timeString;

    // Update progress circle
    const progress =
      ((this.totalTime - this.currentTime) / this.totalTime) * 565.48;
    const progressFill = document.getElementById("progressFill");
    if (progressFill) {
      progressFill.style.strokeDashoffset = 565.48 - progress;
    }
  }

  previousStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.updateStepHighlight();
    }
  }

  nextStep() {
    const exercise = this.exercises[this.currentExercise];
    if (this.currentStep < exercise.instructions.length - 1) {
      this.currentStep++;
      this.updateStepHighlight();
    }
  }

  updateStepHighlight() {
    const steps = document.querySelectorAll(".step");
    steps.forEach((step, index) => {
      step.classList.toggle("active", index === this.currentStep);
    });
  }

  toggleAudioPanel() {
    const panel = document.getElementById("audioPanel");
    panel.classList.toggle("active");
  }

  testAudio() {
    if (this.audioPath) {
      if (this.meditationAudio) {
        this.meditationAudio.src = this.audioPath;
        this.meditationAudio.play().catch((e) => {
          alert("Could not play audio file. Please check the path.");
          console.error("Audio test failed:", e);
        });
      }
    } else {
      alert("Please enter an audio file path first.");
    }
  }

  exitZenMode() {
    // Stop any running sessions
    this.resetSession();

    // Close the zen mode (you might want to navigate back to main app)
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  }
}

// Initialize the Zen Meditation Space when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new ZenMeditationSpace();
});

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    const playBtn = document.getElementById("playPauseBtn");
    if (playBtn) playBtn.click();
  } else if (e.code === "Escape") {
    const resetBtn = document.getElementById("resetBtn");
    if (resetBtn) resetBtn.click();
  } else if (e.code === "ArrowLeft") {
    const prevBtn = document.getElementById("prevBtn");
    if (prevBtn) prevBtn.click();
  } else if (e.code === "ArrowRight") {
    const nextBtn = document.getElementById("nextBtn");
    if (nextBtn) nextBtn.click();
  }
});

// Prevent accidental page navigation
window.addEventListener("beforeunload", (e) => {
  // Only show warning if a session is running
  const zenSpace = window.zenMeditationSpace;
  if (zenSpace && zenSpace.isRunning) {
    e.preventDefault();
    e.returnValue =
      "You have an active meditation session. Are you sure you want to leave?";
    return e.returnValue;
  }
});