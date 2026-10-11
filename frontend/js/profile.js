/**
 * profile.js — Profile page logic.
 * 
 * Responsibilities (spec.md sections 7.5, 13, 22):
 *  - Enforces route protection via requireAuth() from api.js.
 *  - Renders navbar via renderNavbar("profile") from ui.js.
 *  - Fetches logged-in student info via GET /auth/me.
 *  - Displays full name, email, member since date, and issue count safely using textContent.
 *  - Delegates logout to handleLogout() from ui.js.
 */

// Route protection & navigation bar initialization
requireAuth();
renderNavbar("profile");

const loadingText = document.getElementById("loading");
const profileMessage = document.getElementById("profile-message");
const profileCard = document.getElementById("profile-card");
const logoutButton = document.getElementById("logout-button");

/**
 * Generate initials avatar from full name (e.g., "Asha Rao" -> "AR").
 * @param {string} fullName 
 * @returns {string} Initials string
 */
function getInitials(fullName) {
  const words = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0].charAt(0);
  const last = words.length > 1 ? words[words.length - 1].charAt(0) : "";
  return (first + last).toUpperCase();
}

function showProfile(user) {
  document.getElementById("avatar").textContent = getInitials(user.full_name);
  document.getElementById("profile-name").textContent = user.full_name || "Student";
  document.getElementById("profile-email").textContent = user.email || "";
  document.getElementById("profile-since").textContent = formatDate(user.created_at) || "Unknown";
  document.getElementById("profile-count").textContent = String(user.issues_reported ?? 0);
  
  profileCard.style.display = "block";
}

function showLoadError(err) {
  const message = err.message || "Could not load your profile. Please try again.";
  showError(profileMessage, message);

  const profileMsgEl = document.getElementById("profile-message");
  if (profileMsgEl) {
    const retryBtn = document.createElement("button");
    retryBtn.type = "button";
    retryBtn.className = "btn btn-secondary btn-sm";
    retryBtn.style.marginTop = "8px";
    retryBtn.textContent = "Try again";
    retryBtn.addEventListener("click", loadProfile);
    profileMsgEl.appendChild(document.createElement("br"));
    profileMsgEl.appendChild(retryBtn);
  }
}

async function loadProfile() {
  clearMessage(profileMessage);
  profileCard.style.display = "none";
  loadingText.style.display = "block";

  try {
    const user = await apiRequest("/auth/me");
    showProfile(user);
  } catch (err) {
    showLoadError(err);
  } finally {
    loadingText.style.display = "none";
  }
}

// Wire logout button to shared handleLogout()
if (logoutButton) {
  logoutButton.addEventListener("click", function () {
    handleLogout();
  });
}

// Load profile on page load
loadProfile();
