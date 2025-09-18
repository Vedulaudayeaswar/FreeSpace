document.addEventListener("DOMContentLoaded", function () {
  // Get user name from previous page or use default
  const userName = localStorage.getItem("userName") || "Friend";
  document.getElementById("userName").textContent = userName;

  // Handle role selection
  const roleCards = document.querySelectorAll(".role-card");

  roleCards.forEach((card) => {
    card.addEventListener("click", function () {
      const selectedRole = this.getAttribute("data-role");

      // Add selection animation
      this.classList.add("selected");

      // Store selected role
      localStorage.setItem("userRole", selectedRole);

      // Navigate based on role
      setTimeout(() => {
        switch (selectedRole) {
          case "student":
            window.location.href = "talk-with-me.html"; // Maya for students
            break;
          case "parent":
            window.location.href = "parent.html"; // ParentBot for parents
            break;
          case "professional":
            window.location.href = "working-professional.html"; // Professional assistant
            break;
          default:
            window.location.href = "talk-with-me.html";
        }
      }, 500); // Small delay for animation
    });

    // Add hover effects
    card.addEventListener("mouseenter", function () {
      this.style.transform = "translateY(-5px) scale(1.02)";
    });

    card.addEventListener("mouseleave", function () {
      if (!this.classList.contains("selected")) {
        this.style.transform = "translateY(0) scale(1)";
      }
    });
  });
});
