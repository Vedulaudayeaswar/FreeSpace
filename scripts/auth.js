document.addEventListener("DOMContentLoaded", function () {
  // Password encryption utility
  function encryptPassword(password) {
    // Simple encryption using base64 and character shifting
    // Note: For production, use proper encryption libraries like bcrypt
    let encrypted = btoa(password); // Base64 encode
    let shifted = "";
    for (let i = 0; i < encrypted.length; i++) {
      shifted += String.fromCharCode(encrypted.charCodeAt(i) + 3);
    }
    return btoa(shifted); // Double encode for extra security
  }

  function decryptPassword(encryptedPassword) {
    try {
      let decoded = atob(encryptedPassword);
      let shifted = "";
      for (let i = 0; i < decoded.length; i++) {
        shifted += String.fromCharCode(decoded.charCodeAt(i) - 3);
      }
      return atob(shifted);
    } catch (e) {
      return null;
    }
  }

  // Notification function
  function showNotification(message, type = "info") {
    console.log("Showing notification:", message, type); // Debug log

    // Remove any existing notifications
    const existingNotification = document.querySelector(".notification");
    if (existingNotification) {
      existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${
          type === "error"
            ? "#ff6b6b"
            : type === "success"
            ? "#4CAF50"
            : "#2196F3"
        };
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        font-family: "Inter", sans-serif;
        font-size: 14px;
        font-weight: 500;
        max-width: 350px;
        word-wrap: break-word;
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.3s ease-out;
    `;

    notification.textContent = message;
    document.body.appendChild(notification);

    // Trigger animation
    setTimeout(() => {
      notification.style.transform = "translateX(0)";
      notification.style.opacity = "1";
    }, 10);

    // Auto remove after 4 seconds
    setTimeout(() => {
      if (notification && notification.parentNode) {
        notification.style.transform = "translateX(100%)";
        notification.style.opacity = "0";
        setTimeout(() => {
          if (notification && notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }
    }, 4000);
  }

  // User database simulation
  function saveUser(userData) {
    let users = JSON.parse(localStorage.getItem("registeredUsers")) || [];
    users.push(userData);
    localStorage.setItem("registeredUsers", JSON.stringify(users));
  }

  function findUser(email, password) {
    let users = JSON.parse(localStorage.getItem("registeredUsers")) || [];
    return users.find(
      (user) =>
        user.email === email && decryptPassword(user.password) === password
    );
  }

  function userExists(email) {
    let users = JSON.parse(localStorage.getItem("registeredUsers")) || [];
    return users.some((user) => user.email === email);
  }

  // Password strength checking functions
  function checkPasswordStrength() {
    const registerPassword = document.getElementById("registerPassword");
    const strengthFill = document.getElementById("passwordStrength");
    const strengthText = document.getElementById("passwordStrengthText");

    if (!registerPassword || !strengthFill || !strengthText) return;

    const password = registerPassword.value;
    let strength = 0;
    let text = "";
    let color = "";

    if (password.length > 0) {
      // Check password strength
      if (password.length < 6) {
        strength = 25;
        text = "Weak";
        color = "#ff6b6b";
      } else if (password.length < 10) {
        strength = 50;
        text = "Fair";
        color = "#feca57";
      } else {
        // Check for uppercase, lowercase, numbers, and special chars
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        const requirementsMet = [
          hasUpperCase,
          hasLowerCase,
          hasNumbers,
          hasSpecial,
        ].filter(Boolean).length;

        if (requirementsMet < 2) {
          strength = 50;
          text = "Fair";
          color = "#feca57";
        } else if (requirementsMet < 4) {
          strength = 75;
          text = "Good";
          color = "#48dbfb";
        } else {
          strength = 100;
          text = "Strong";
          color = "#1dd1a1";
        }
      }
    }

    strengthFill.style.width = strength + "%";
    strengthFill.style.background = color;
    strengthText.textContent = text;
    strengthText.style.color = color;
  }

  function checkPasswordMatch() {
    const registerPassword = document.getElementById("registerPassword");
    const confirmPassword = document.getElementById("registerConfirmPassword");
    const passwordMatchError = document.getElementById("passwordMatchError");

    if (!registerPassword || !confirmPassword || !passwordMatchError) return;

    const password = registerPassword.value;
    const confirm = confirmPassword.value;

    if (confirm.length > 0) {
      if (password !== confirm) {
        passwordMatchError.textContent = "Passwords do not match";
      } else {
        passwordMatchError.textContent = "";
      }
    } else {
      passwordMatchError.textContent = "";
    }
  }

  // Toggle password visibility functions
  function setupPasswordToggle(toggleId, passwordId) {
    const toggle = document.getElementById(toggleId);
    if (toggle) {
      toggle.addEventListener("click", function () {
        const passwordInput = document.getElementById(passwordId);
        const type =
          passwordInput.getAttribute("type") === "password"
            ? "text"
            : "password";
        passwordInput.setAttribute("type", type);

        const eyeIcon = this.querySelector("i");
        eyeIcon.classList.toggle("fa-eye");
        eyeIcon.classList.toggle("fa-eye-slash");
      });
    }
  }

  // Setup all password toggles
  setupPasswordToggle("toggleLoginPassword", "loginPassword");
  setupPasswordToggle("toggleRegisterPassword", "registerPassword");
  setupPasswordToggle("toggleConfirmPassword", "registerConfirmPassword");

  // Setup password strength checking
  const registerPassword = document.getElementById("registerPassword");
  const confirmPassword = document.getElementById("registerConfirmPassword");

  if (registerPassword) {
    registerPassword.addEventListener("input", checkPasswordStrength);
  }

  if (confirmPassword) {
    confirmPassword.addEventListener("input", checkPasswordMatch);
  }

  // Registration form submission
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", function (e) {
      e.preventDefault();
      console.log("Register form submitted"); // Debug log

      const name = document.getElementById("registerName").value.trim();
      const email = document.getElementById("registerEmail").value.trim();
      const password = document.getElementById("registerPassword").value;
      const confirmPassword = document.getElementById(
        "registerConfirmPassword"
      ).value;
      const termsAgree = document.getElementById("termsAgree").checked;

      // Validation
      if (!name || !email || !password || !confirmPassword) {
        showNotification("Please fill in all fields", "error");
        return;
      }

      if (password !== confirmPassword) {
        showNotification("Passwords do not match", "error");
        return;
      }

      if (!termsAgree) {
        showNotification("Please agree to the terms and conditions", "error");
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showNotification("Please enter a valid email address", "error");
        return;
      }

      // Password strength validation
      if (password.length < 6) {
        showNotification(
          "Password must be at least 6 characters long",
          "error"
        );
        return;
      }

      // Check if user already exists
      if (userExists(email)) {
        showNotification(
          "An account with this email already exists. Please login instead.",
          "error"
        );
        setTimeout(() => {
          // Switch to login tab
          const loginTab = document.querySelector('[href="#login"]');
          if (loginTab) loginTab.click();
        }, 2000);
        return;
      }

      // Simulate registration process
      showNotification("Creating your account...", "success");

      // Encrypt password and save user
      const encryptedPassword = encryptPassword(password);
      const userData = {
        name: name,
        email: email,
        password: encryptedPassword,
        registeredAt: new Date().toISOString(),
      };

      setTimeout(() => {
        saveUser(userData);
        showNotification(
          "Account created successfully! Please login to continue.",
          "success"
        );

        // Clear form
        registerForm.reset();

        // Switch to login tab after 2 seconds
        setTimeout(() => {
          const loginTab = document.querySelector('[href="#login"]');
          if (loginTab) loginTab.click();
          // Pre-fill email in login form
          const loginEmailField = document.getElementById("loginEmail");
          if (loginEmailField) loginEmailField.value = email;
        }, 2000);
      }, 1500);
    });
  }

  // Login form submission
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      console.log("Login form submitted"); // Debug log

      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value;

      // Validation
      if (!email || !password) {
        showNotification("Please fill in all fields", "error");
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showNotification("Please enter a valid email address", "error");
        return;
      }

      // Check if user exists and password matches
      const user = findUser(email, password);
      if (!user) {
        showNotification(
          "Invalid email or password. Please try again.",
          "error"
        );
        return;
      }

      // Simulate login process
      showNotification("Logging in...", "success");

      setTimeout(() => {
        // Store current user session
        localStorage.setItem(
          "currentUser",
          JSON.stringify({
            email: user.email,
            name: user.name,
            loginTime: new Date().toISOString(),
          })
        );

        showNotification(
          "Login successful! Redirecting to face authentication...",
          "success"
        );

        setTimeout(() => {
          window.location.href = "face-auth.html";
        }, 1000);
      }, 1500);
    });
  }

  // Tab switching functionality
  const tabLinks = document.querySelectorAll("[data-tab]");
  const tabContents = document.querySelectorAll(".tab-content");

  tabLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();

      const targetTab = this.getAttribute("data-tab");

      // Remove active class from all tabs and contents
      tabLinks.forEach((l) => l.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      // Add active class to clicked tab and corresponding content
      this.classList.add("active");
      const targetElement = document.getElementById(targetTab);
      if (targetElement) targetElement.classList.add("active");
    });
  });

  console.log("Auth.js loaded successfully"); // Debug log
});
