document.addEventListener("DOMContentLoaded", function () {
  // Motivational messages array
  const motivationalMessages = [
    "Your bright energy is contagious! Keep spreading those good vibes! ✨",
    "You're absolutely glowing today! Your positivity lights up the world! 🌟",
    "What a wonderful soul you are! Your happiness is truly inspiring! 💫",
    "You're a beacon of joy! Keep shining and brightening everyone's day! ☀️",
    "Your smile is your superpower! Thank you for sharing it with the world! 😊",
    "You radiate such beautiful energy! The world is brighter because of you! 🌈",
    "Your positive spirit is absolutely magical! Keep being amazing! ✨",
    "You're living proof that happiness is contagious! Keep spreading joy! 🦋",
    "Your optimism is a gift to everyone around you! Stay wonderful! 🎁",
    "You have such a beautiful heart! Your happiness makes everything better! 💖",
  ];

  // Daily wellness tips
  const dailyTips = [
    "Take a moment to appreciate three things that made you smile today! 😊",
    "Share your positive energy with someone who needs it today! 🤗",
    "Practice gratitude by writing down one beautiful moment from today! ✍️",
    "Take 5 deep breaths and feel the joy flowing through you! 🌬️",
    "Look in the mirror and give yourself a genuine compliment! 💕",
    "Do something kind for yourself - you deserve it! 🎈",
    "Call or text someone you love and tell them how much they mean to you! 📱",
    "Step outside and soak in some sunshine or fresh air! 🌞",
    "Listen to your favorite uplifting song and dance like nobody's watching! 🎵",
    "Keep a happiness journal - write down what's making you feel great! 📔",
  ];

  // Inspirational quotes
  const inspirationalQuotes = [
    {
      text: "Happiness is not something ready-made. It comes from your own actions.",
      author: "Dalai Lama",
    },
    {
      text: "The best way to cheer yourself is to try to cheer somebody else up.",
      author: "Mark Twain",
    },
    {
      text: "Happiness is when what you think, what you say, and what you do are in harmony.",
      author: "Mahatma Gandhi",
    },
    {
      text: "The most important thing is to enjoy your life - to be happy - it's all that matters.",
      author: "Audrey Hepburn",
    },
    {
      text: "Happiness is a choice, not a result. Nothing will make you happy until you choose to be happy.",
      author: "Ralph Marston",
    },
    {
      text: "The purpose of our lives is to be happy.",
      author: "Dalai Lama",
    },
    {
      text: "Be happy for this moment. This moment is your life.",
      author: "Omar Khayyam",
    },
    {
      text: "Happiness is not by chance, but by choice.",
      author: "Jim Rohn",
    },
  ];

  // Get user's happiness score from localStorage
  const currentUser = JSON.parse(localStorage.getItem("currentUser")) || {};
  const happinessScore = currentUser.happiness || 80;

  // Update happiness percentage display
  const happinessElement = document.getElementById("happinessPercentage");
  if (happinessElement) {
    happinessElement.textContent = `${happinessScore}%`;
  }

  // Set random motivational message
  const messageElement = document.getElementById("motivationalMessage");
  if (messageElement) {
    const randomMessage =
      motivationalMessages[
        Math.floor(Math.random() * motivationalMessages.length)
      ];
    messageElement.textContent = randomMessage;
  }

  // Set random daily tip
  const tipElement = document.getElementById("dailyTip");
  if (tipElement) {
    const randomTip = dailyTips[Math.floor(Math.random() * dailyTips.length)];
    tipElement.textContent = randomTip;
  }

  // Set random inspirational quote
  const quoteElement = document.getElementById("inspirationalQuote");
  const quoteContainer = quoteElement.parentElement;
  if (quoteElement && quoteContainer) {
    const randomQuote =
      inspirationalQuotes[
        Math.floor(Math.random() * inspirationalQuotes.length)
      ];
    quoteElement.textContent = `"${randomQuote.text}"`;

    const cite = quoteContainer.querySelector("cite");
    if (cite) {
      cite.textContent = `- ${randomQuote.author}`;
    }
  }

  // Add celebration particles effect
  createCelebrationParticles();

  // Celebration particles function
  function createCelebrationParticles() {
    const colors = [
      "#FFD700",
      "#FFA500",
      "#FF6347",
      "#FF69B4",
      "#00CED1",
      "#98FB98",
    ];

    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        const particle = document.createElement("div");
        particle.style.cssText = `
                    position: fixed;
                    width: 10px;
                    height: 10px;
                    background: ${
                      colors[Math.floor(Math.random() * colors.length)]
                    };
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: 1000;
                    left: ${Math.random() * window.innerWidth}px;
                    top: ${window.innerHeight + 10}px;
                    animation: celebration-float 3s ease-out forwards;
                `;

        document.body.appendChild(particle);

        // Remove particle after animation
        setTimeout(() => {
          particle.remove();
        }, 3000);
      }, i * 200);
    }
  }

  // Add CSS animation for celebration particles
  const style = document.createElement("style");
  style.textContent = `
        @keyframes celebration-float {
            0% {
                transform: translateY(0) rotate(0deg);
                opacity: 1;
            }
            100% {
                transform: translateY(-${
                  window.innerHeight + 100
                }px) rotate(360deg);
                opacity: 0;
            }
        }
    `;
  document.head.appendChild(style);

  // Add sparkle effect to the happiness score circle
  const scoreCircle = document.querySelector(".score-circle");
  if (scoreCircle) {
    setInterval(() => {
      const sparkle = document.createElement("div");
      sparkle.style.cssText = `
                position: absolute;
                width: 4px;
                height: 4px;
                background: #fff;
                border-radius: 50%;
                top: ${Math.random() * 100}%;
                left: ${Math.random() * 100}%;
                animation: sparkle 1s ease-out forwards;
                pointer-events: none;
            `;

      scoreCircle.style.position = "relative";
      scoreCircle.appendChild(sparkle);

      setTimeout(() => {
        sparkle.remove();
      }, 1000);
    }, 500);
  }

  // Add sparkle animation
  const sparkleStyle = document.createElement("style");
  sparkleStyle.textContent = `
        @keyframes sparkle {
            0% {
                transform: scale(0);
                opacity: 1;
            }
            50% {
                transform: scale(1);
                opacity: 1;
            }
            100% {
                transform: scale(0);
                opacity: 0;
            }
        }
    `;
  document.head.appendChild(sparkleStyle);

  // Make sure the "Share Your Joy" button goes to role selection:
  document.querySelector(".btn.primary").addEventListener("click", (e) => {
    e.preventDefault();
    // Go to role selection to choose chat type
    window.location.href = "who-are-you.html";
  });
});
