/**
 * ui.js — Shared UI components, helpers, and DOM utilities.
 * 
 * Responsibilities (spec.md sections 13, 16):
 *  - Top navigation bar rendering across protected pages.
 *  - Status badge generation with accessible labels & color dots.
 *  - Alert messages (error, success, info) with safe textContent rendering.
 *  - Form field error states and validation feedback.
 *  - Date formatting helper.
 *  - Button loading state helper.
 *  - Shared logout handler.
 */

/**
 * Render the shared top navigation bar into a container element.
 * @param {string} activePage - The currently active page ('dashboard', 'create-issue', 'profile').
 */
function renderNavbar(activePage = "") {
  const container = document.getElementById("navbar-container");
  if (!container) return;

  container.innerHTML = `
    <header class="navbar" role="banner">
      <div class="container navbar-container">
        <a href="dashboard.html" class="navbar-brand" aria-label="CampusConnect Home">
          <span>CampusConnect</span>
        </a>
        <nav class="navbar-nav" aria-label="Main Navigation">
          <a href="dashboard.html" class="nav-link ${activePage === "dashboard" ? "active" : ""}">Dashboard</a>
          <a href="create-issue.html" class="nav-link ${activePage === "create-issue" ? "active" : ""}">New Issue</a>
          <a href="profile.html" class="nav-link ${activePage === "profile" ? "active" : ""}">Profile</a>
          <button type="button" id="logout-btn" class="nav-btn-logout" onclick="handleLogout()">Log Out</button>
        </nav>
      </div>
    </header>
  `;
}

/**
 * Utility to escape HTML special characters for safe string interpolation.
 * @param {string} text - The input string.
 * @returns {string} The escaped string.
 */
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generate HTML string for an issue status badge.
 * Always renders both a colored dot and text label (spec.md section 16).
 * 
 * @param {string} status - 'Open', 'In Progress', or 'Resolved'.
 * @returns {string} HTML string for the status badge.
 */
function createStatusBadge(status) {
  let badgeClass = "status-open";
  let label = "Open";

  if (status === "In Progress") {
    badgeClass = "status-progress";
    label = "In Progress";
  } else if (status === "Resolved") {
    badgeClass = "status-resolved";
    label = "Resolved";
  } else if (status === "Open") {
    badgeClass = "status-open";
    label = "Open";
  } else {
    badgeClass = "status-open";
    label = escapeHtml(String(status || "Open"));
  }

  return `<span class="status-badge ${badgeClass}">${label}</span>`;
}

/**
 * Display a banner message (error, success, or info) in a container.
 * Uses textContent to prevent script injection (spec.md section 13).
 * 
 * @param {HTMLElement|string} container - The DOM element or ID of the message container.
 * @param {string} message - The message text to display.
 * @param {'error'|'success'|'info'} [type='error'] - The message type.
 */
function showMessage(container, message, type = "error") {
  const el = typeof container === "string" ? document.getElementById(container) : container;
  if (!el) return;

  el.className = `message-box message-${type} visible`;
  el.textContent = message;
}

/**
 * Clear and hide a banner message container.
 * @param {HTMLElement|string} container - The DOM element or ID of the message container.
 */
function clearMessage(container) {
  const el = typeof container === "string" ? document.getElementById(container) : container;
  if (!el) return;

  el.className = "message-box";
  el.textContent = "";
}

/**
 * Set an input field to an invalid state and display its field-level error message.
 * 
 * @param {HTMLInputElement|string} input - The input element or ID.
 * @param {HTMLElement|string} errorContainer - The error message container or ID.
 * @param {string} errorMessage - The error message to show.
 */
function setFieldError(input, errorContainer, errorMessage) {
  const inputEl = typeof input === "string" ? document.getElementById(input) : input;
  const errorEl = typeof errorContainer === "string" ? document.getElementById(errorContainer) : errorContainer;

  if (inputEl) {
    inputEl.classList.add("input-error");
    inputEl.setAttribute("aria-invalid", "true");
  }

  if (errorEl) {
    errorEl.textContent = errorMessage;
    errorEl.classList.add("visible");
  }
}

/**
 * Clear an input field's invalid state and hide its field-level error message.
 * 
 * @param {HTMLInputElement|string} input - The input element or ID.
 * @param {HTMLElement|string} errorContainer - The error message container or ID.
 */
function clearFieldError(input, errorContainer) {
  const inputEl = typeof input === "string" ? document.getElementById(input) : input;
  const errorEl = typeof errorContainer === "string" ? document.getElementById(errorContainer) : errorContainer;

  if (inputEl) {
    inputEl.classList.remove("input-error");
    inputEl.removeAttribute("aria-invalid");
  }

  if (errorEl) {
    errorEl.textContent = "";
    errorEl.classList.remove("visible");
  }
}

/**
 * Clear all field errors within a form element.
 * @param {HTMLFormElement|string} form - The form element or ID.
 */
function clearAllFieldErrors(form) {
  const formEl = typeof form === "string" ? document.getElementById(form) : form;
  if (!formEl) return;

  const inputs = formEl.querySelectorAll(".form-control");
  inputs.forEach((input) => {
    input.classList.remove("input-error");
    input.removeAttribute("aria-invalid");
  });

  const errors = formEl.querySelectorAll(".field-error");
  errors.forEach((error) => {
    error.textContent = "";
    error.classList.remove("visible");
  });
}

/**
 * Format an ISO-8601 date string into a user-friendly readable date.
 * Example: "Oct 7, 2026, 10:00 AM"
 * 
 * @param {string} isoString - The ISO date string.
 * @returns {string} Formatted date string.
 */
function formatDate(isoString) {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

/**
 * Toggle a button between loading and normal states.
 * 
 * @param {HTMLButtonElement|string} button - The button element or ID.
 * @param {boolean} isLoading - Whether the button is loading.
 * @param {string} [loadingText="Loading..."] - The text to display while loading.
 */
function setButtonLoading(button, isLoading, loadingText = "Loading...") {
  const btn = typeof button === "string" ? document.getElementById(button) : button;
  if (!btn) return;

  if (isLoading) {
    if (!btn.dataset.originalText) {
      btn.dataset.originalText = btn.textContent;
    }
    btn.textContent = loadingText;
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
  } else {
    if (btn.dataset.originalText) {
      btn.textContent = btn.dataset.originalText;
    }
    btn.disabled = false;
    btn.removeAttribute("aria-busy");
  }
}

/**
 * Shared logout handler: calls POST /auth/logout, clears token, and redirects to index.html.
 */
async function handleLogout() {
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    setButtonLoading(logoutBtn, true, "Logging out...");
  }

  try {
    // Attempt backend logout to invalidate token in SQLite database
    await apiRequest("/auth/logout", { method: "POST" });
  } catch (err) {
    // Even if backend logout encounters an error or network issue,
    // we still proceed to clear local token and redirect.
    console.warn("Logout request completed with warning:", err.message);
  } finally {
    clearToken();
    window.location.href = "index.html";
  }
}
