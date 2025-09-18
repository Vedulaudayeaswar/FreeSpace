document.addEventListener("DOMContentLoaded", function () {
  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  const statusIndicator = document.getElementById("statusIndicator");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const happinessMeter = document.getElementById("happinessMeter");
  const happinessValue = document.getElementById("happinessValue");

  let modelsLoaded = false;
  let faceDetectionInterval;
  let hasRedirected = false;

  // Load face-api.js models
  async function loadModels() {
    try {
      statusIndicator.querySelector("span").textContent =
        "Loading face detection models...";

      await faceapi.nets.tinyFaceDetector.loadFromUri(
        "https://justadudewhohacks.github.io/face-api.js/models"
      );
      await faceapi.nets.faceLandmark68Net.loadFromUri(
        "https://justadudewhohacks.github.io/face-api.js/models"
      );
      await faceapi.nets.faceExpressionNet.loadFromUri(
        "https://justadudewhohacks.github.io/face-api.js/models"
      );

      modelsLoaded = true;
      statusIndicator.querySelector("span").textContent =
        "Models loaded. Starting camera...";
      startCamera();
    } catch (error) {
      console.error("Error loading models:", error);
      statusIndicator.querySelector("span").textContent =
        "Error loading models. Please refresh the page.";
    }
  }

  // Start camera
  async function startCamera() {
    try {
      statusIndicator.querySelector("span").textContent =
        "Searching for laptop camera...";

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );

      let selectedDeviceId = null;
      const builtInKeywords = [
        "integrated",
        "built-in",
        "internal",
        "webcam",
        "facetime",
        "front",
      ];

      for (const device of videoDevices) {
        const label = device.label.toLowerCase();
        if (builtInKeywords.some((keyword) => label.includes(keyword))) {
          selectedDeviceId = device.deviceId;
          break;
        }
      }

      if (!selectedDeviceId && videoDevices.length > 0) {
        selectedDeviceId = videoDevices[0].deviceId;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      });

      video.srcObject = stream;

      video.onloadedmetadata = () => {
        statusIndicator.classList.add("ready");
        statusIndicator.querySelector("span").textContent =
          "Camera ready. Analyzing your mood...";
        analyzeBtn.disabled = false;
        startFaceDetection();
      };
    } catch (error) {
      console.error("Error accessing camera:", error);
      statusIndicator.querySelector("span").textContent =
        "Cannot access camera. Please check permissions.";
    }
  }

  // FIXED: Correct redirection logic
  function handleMoodResult(happinessScore) {
    if (hasRedirected) return;
    hasRedirected = true;

    // Stop detection and camera
    if (faceDetectionInterval) {
      clearInterval(faceDetectionInterval);
    }

    if (video && video.srcObject) {
      const tracks = video.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    }

    console.log(`Final Happiness Score: ${happinessScore}%`);

    // Store the happiness score
    const currentUser = JSON.parse(localStorage.getItem("currentUser")) || {};
    currentUser.happiness = happinessScore;
    localStorage.setItem("currentUser", JSON.stringify(currentUser));

    if (happinessScore < 80) {
      // Low happiness - redirect to who-are-you.html for role selection
      statusIndicator.querySelector("span").innerHTML = `
        <span style="color: #ff6b6b;">💙 Let's help you feel better. Redirecting to role selection...</span>
      `;

      setTimeout(() => {
        console.log("Redirecting to who-are-you.html");
        window.location.href = "who-are-you.html"; // Changed from talk-with-me.html
      }, 2000);
    } else {
      // High happiness - redirect to happy-result.html for celebration
      const messages = [
        "Your bright smile lights up the world! ✨",
        "Keep radiating that positive energy! 🌟",
        "You're doing amazing - keep it up! 💪",
        "Your happiness is contagious! 😊",
        "What a wonderful mood you're in today! 🎉",
      ];

      const randomMsg = messages[Math.floor(Math.random() * messages.length)];

      statusIndicator.querySelector("span").innerHTML = `
        <span style="color: #4CAF50;">${randomMsg}</span>
      `;

      setTimeout(() => {
        console.log("Redirecting to happy-result.html");
        window.location.href = "happy-result.html";
      }, 3000);
    }
  }

  // Add this function to handle routing after mood analysis:
  function handleMoodAnalysisResult(happinessLevel) {
    // Store happiness level for later use
    localStorage.setItem("userHappinessLevel", happinessLevel);

    // If happiness is 80% or higher, go to happy-result.html
    if (happinessLevel >= 80) {
      setTimeout(() => {
        window.location.href = "happy-result.html";
      }, 2000); // 2 second delay to show the result
    } else {
      // If happiness is less than 80%, go to who-are-you.html
      setTimeout(() => {
        window.location.href = "who-are-you.html";
      }, 2000);
    }
  }

  // Enhanced face detection with better emotion analysis
  function startFaceDetection() {
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    let emotionReadings = [];
    let stableDetectionCount = 0;
    const requiredStableDetections = 8; // Need 8 stable readings

    faceDetectionInterval = setInterval(async () => {
      if (modelsLoaded && !hasRedirected) {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceExpressions();

        const resizedDetections = faceapi.resizeResults(
          detections,
          displaySize
        );
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

        if (detections.length > 0) {
          statusIndicator.classList.add("detecting");

          const expressions = detections[0].expressions;

          // Calculate comprehensive emotion score (not just happiness)
          const happy = expressions.happy * 100;
          const sad = expressions.sad * 100;
          const angry = expressions.angry * 100;
          const fearful = expressions.fearful * 100;
          const disgusted = expressions.disgusted * 100;
          const surprised = expressions.surprised * 100;
          const neutral = expressions.neutral * 100;

          // Calculate overall positivity score
          const positiveEmotions = happy + surprised * 0.5; // Surprise can be positive
          const negativeEmotions = sad + angry + fearful + disgusted;

          // Overall happiness index considering all emotions
          let overallHappiness = Math.max(
            0,
            Math.min(
              100,
              positiveEmotions - negativeEmotions * 0.7 + neutral * 0.3
            )
          );

          // Ensure minimum detection for very low expressions
          if (happy < 5 && sad > 15) {
            overallHappiness = Math.max(5, happy);
          }

          overallHappiness = Math.round(overallHappiness);

          // Update UI
          happinessMeter.style.width = `${overallHappiness}%`;
          happinessValue.textContent = `${overallHappiness}%`;

          // Store emotion reading
          emotionReadings.push({
            happiness: overallHappiness,
            dominant: Object.keys(expressions).reduce((a, b) =>
              expressions[a] > expressions[b] ? a : b
            ),
          });

          if (emotionReadings.length > 10) {
            emotionReadings.shift();
          }

          // Determine emotion status
          let emotionStatus = "";
          let statusColor = "";

          if (overallHappiness >= 80) {
            emotionStatus = "Very Happy 😊";
            statusColor = "#4CAF50";
          } else if (overallHappiness >= 60) {
            emotionStatus = "Happy 🙂";
            statusColor = "#8BC34A";
          } else if (overallHappiness >= 40) {
            emotionStatus = "Neutral 😐";
            statusColor = "#FFC107";
          } else if (overallHappiness >= 20) {
            emotionStatus = "Sad 😔";
            statusColor = "#FF9800";
          } else {
            emotionStatus = "Very Sad 😢";
            statusColor = "#F44336";
          }

          statusIndicator.querySelector("span").innerHTML = `
            <span style="color: ${statusColor};">${emotionStatus} (${overallHappiness}%)</span>
          `;

          // Check for stable readings
          if (emotionReadings.length >= 6) {
            const avgHappiness = Math.round(
              emotionReadings.reduce(
                (sum, reading) => sum + reading.happiness,
                0
              ) / emotionReadings.length
            );

            const isStable = emotionReadings.every(
              (reading) => Math.abs(reading.happiness - avgHappiness) < 15
            );

            if (isStable) {
              stableDetectionCount++;

              console.log(
                `Stable detection ${stableDetectionCount}/${requiredStableDetections}, Avg happiness: ${avgHappiness}%`
              );

              if (stableDetectionCount >= requiredStableDetections) {
                console.log(`Stable emotion detected: ${avgHappiness}%`);
                handleMoodResult(avgHappiness);
                return;
              }
            } else {
              stableDetectionCount = Math.max(0, stableDetectionCount - 1);
            }
          }

          // Draw detections
          faceapi.draw.drawDetections(canvas, resizedDetections);
        } else {
          statusIndicator.classList.remove("detecting");
          statusIndicator.querySelector("span").textContent =
            "No face detected. Face the camera.";
          emotionReadings = [];
          stableDetectionCount = 0;
          happinessMeter.style.width = "0%";
          happinessValue.textContent = "0%";
        }
      }
    }, 300); // Check every 300ms
  }

  // Manual analyze button
  analyzeBtn.addEventListener("click", async () => {
    if (hasRedirected) return;

    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Analyzing...';

    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceExpressions();

    if (detections.length > 0) {
      const expressions = detections[0].expressions;
      const happy = expressions.happy * 100;
      const sad = expressions.sad * 100;

      // Calculate overall happiness like in automatic detection
      let overallHappiness = Math.max(
        0,
        Math.min(100, happy - sad * 0.7 + expressions.neutral * 30)
      );

      overallHappiness = Math.round(overallHappiness);

      happinessMeter.style.width = `${overallHappiness}%`;
      happinessValue.textContent = `${overallHappiness}%`;

      setTimeout(() => {
        console.log(`Manual analysis: ${overallHappiness}%`);
        handleMoodResult(overallHappiness);
      }, 1500);
    } else {
      statusIndicator.querySelector("span").textContent =
        "No face detected. Please try again.";
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = '<i class="fas fa-smile"></i> Analyze My Mood';
    }
  });

  // Initialize
  loadModels();

  // Cleanup
  window.addEventListener("beforeunload", () => {
    if (faceDetectionInterval) clearInterval(faceDetectionInterval);
    if (video.srcObject) {
      video.srcObject.getTracks().forEach((track) => track.stop());
    }
  });
});
