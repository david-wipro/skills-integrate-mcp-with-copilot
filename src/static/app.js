document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const authButton = document.getElementById("auth-button");
  const loginSection = document.getElementById("login-section");
  const loginForm = document.getElementById("login-form");
  const logoutButton = document.getElementById("logout-button");
  const loginMessage = document.getElementById("login-message");
  const authStatus = document.getElementById("auth-status");
  const teacherNote = document.getElementById("teacher-note");

  let currentTeacher = null;
  let authToken = localStorage.getItem("teacherToken") || null;

  function getAuthHeader() {
    if (!authToken) {
      return {};
    }
    return { Authorization: `Bearer ${authToken}` };
  }

  function updateAuthUI() {
    const isLoggedIn = !!currentTeacher;
    authStatus.textContent = isLoggedIn
      ? `Logged in as ${currentTeacher}`
      : "Teacher login required";
    logoutButton.classList.toggle("hidden", !isLoggedIn);
    teacherNote.textContent = isLoggedIn
      ? "Teacher is signed in. You can register or unregister students."
      : "Teacher login required to register or unregister students.";
    document.getElementById("email").disabled = !isLoggedIn;
    activitySelect.disabled = !isLoggedIn;
    signupForm.querySelector("button[type=submit]").disabled = !isLoggedIn;
  }

  async function checkLogin() {
    if (!authToken) {
      currentTeacher = null;
      updateAuthUI();
      return;
    }

    try {
      const response = await fetch("/admin/me", {
        headers: getAuthHeader(),
      });
      const result = await response.json();

      if (response.ok && result.logged_in) {
        currentTeacher = result.username;
      } else {
        currentTeacher = null;
        authToken = null;
        localStorage.removeItem("teacherToken");
        localStorage.removeItem("teacherName");
      }
    } catch (error) {
      currentTeacher = null;
      authToken = null;
      localStorage.removeItem("teacherToken");
      localStorage.removeItem("teacherName");
      console.error("Error checking login status:", error);
    }

    updateAuthUI();
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
                <h5>Participants:</h5>
                <ul class="participants-list">
                  ${details.participants
                    .map((email) =>
                      `<li><span class="participant-email">${email}</span>${currentTeacher ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>` : ""}</li>`
                    )
                    .join("")}
                </ul>
              </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      if (currentTeacher) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: getAuthHeader(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  async function handleSignup(event) {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = activitySelect.value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: getAuthHeader(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  }

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function showLoginMessage(text, type) {
    loginMessage.textContent = text;
    loginMessage.className = type;
    loginMessage.classList.remove("hidden");

    setTimeout(() => {
      loginMessage.classList.add("hidden");
    }, 5000);
  }

  authButton.addEventListener("click", () => {
    loginSection.classList.toggle("hidden");
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("teacher-username").value;
    const password = document.getElementById("teacher-password").value;

    try {
      const response = await fetch("/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok) {
        authToken = result.token;
        currentTeacher = result.username;
        localStorage.setItem("teacherToken", authToken);
        localStorage.setItem("teacherName", currentTeacher);
        updateAuthUI();
        showLoginMessage("Login successful.", "success");
        loginSection.classList.add("hidden");
        fetchActivities();
      } else {
        showLoginMessage(result.detail || "Login failed", "error");
      }
    } catch (error) {
      showLoginMessage("Failed to login. Please try again.", "error");
      console.error("Login error:", error);
    }
  });

  logoutButton.addEventListener("click", async () => {
    try {
      await fetch("/admin/logout", {
        method: "POST",
        headers: getAuthHeader(),
      });
    } catch (error) {
      console.error("Logout error:", error);
    }

    currentTeacher = null;
    authToken = null;
    localStorage.removeItem("teacherToken");
    localStorage.removeItem("teacherName");
    updateAuthUI();
    fetchActivities();
  });

  signupForm.addEventListener("submit", handleSignup);

  checkLogin().then(fetchActivities);
});
