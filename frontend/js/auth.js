/**
 * auth.js — Login and Registration page logic.
 * 
 * Responsibilities (spec.md sections 7.1, 13, 15, 18):
 *  - Form validation for Login and Register.
 *  - Tab switching between Log In and Register.
 *  - API integration for POST /auth/login and POST /auth/register.
 *  - Token persistence and redirect to dashboard.html upon successful authentication.
 *  - Graceful handling of invalid credentials, duplicate accounts, validation errors,
 *    and backend unavailability.
 */

// Email regex matching the backend validation pattern (schemas.py)
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

document.addEventListener("DOMContentLoaded", () => {
  initAuthPage();
});

/**
 * Initialize the auth page: check existing session, set up tabs and event handlers.
 */
async function initAuthPage() {
  // If a token is already present, verify session validity with GET /auth/me
  if (isAuthenticated()) {
    try {
      await apiRequest("/auth/me");
      // Token is valid; proceed to dashboard
      window.location.href = "dashboard.html";
      return;
    } catch {
      // Invalid/expired token was automatically cleared by apiRequest
    }
  }

  setupTabs();
  setupLoginForm();
  setupRegisterForm();
  setupRealtimeValidation();
}

/**
 * Configure tab switching between Login and Register panels.
 */
function setupTabs() {
  const tabLogin = document.getElementById("tab-login");
  const tabRegister = document.getElementById("tab-register");
  const loginPanel = document.getElementById("login-panel");
  const registerPanel = document.getElementById("register-panel");

  if (!tabLogin || !tabRegister || !loginPanel || !registerPanel) return;

  function switchTab(target) {
    if (target === "login") {
      tabLogin.classList.add("active");
      tabLogin.setAttribute("aria-selected", "true");
      tabRegister.classList.remove("active");
      tabRegister.setAttribute("aria-selected", "false");

      loginPanel.style.display = "block";
      registerPanel.style.display = "none";

      clearAllFieldErrors("login-form");
      clearAllFieldErrors("register-form");
      clearMessage("login-message");
      clearMessage("register-message");

      const emailInput = document.getElementById("login-email");
      if (emailInput) emailInput.focus();
    } else {
      tabRegister.classList.add("active");
      tabRegister.setAttribute("aria-selected", "true");
      tabLogin.classList.remove("active");
      tabLogin.setAttribute("aria-selected", "false");

      registerPanel.style.display = "block";
      loginPanel.style.display = "none";

      clearAllFieldErrors("login-form");
      clearAllFieldErrors("register-form");
      clearMessage("login-message");
      clearMessage("register-message");

      const nameInput = document.getElementById("register-name");
      if (nameInput) nameInput.focus();
    }
  }

  tabLogin.addEventListener("click", () => switchTab("login"));
  tabRegister.addEventListener("click", () => switchTab("register"));
}

/**
 * Attach real-time input event listeners to clear field errors on input.
 */
function setupRealtimeValidation() {
  const inputs = document.querySelectorAll("#login-form .form-control, #register-form .form-control");
  inputs.forEach((input) => {
    input.addEventListener("input", () => {
      const errorEl = document.getElementById(`${input.id}-error`);
      if (errorEl) {
        clearFieldError(input, errorEl);
      }
    });
  });
}

/**
 * Configure Login form submission and validation.
 */
function setupLoginForm() {
  const form = document.getElementById("login-form");
  const submitBtn = document.getElementById("login-submit-btn");
  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");
  const messageEl = document.getElementById("login-message");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAllFieldErrors(form);
    clearMessage(messageEl);

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    let hasError = false;

    // Validate email
    if (!email) {
      setFieldError(emailInput, "login-email-error", "Please enter your email address.");
      hasError = true;
    } else if (!EMAIL_REGEX.test(email) || email.length > 120) {
      setFieldError(emailInput, "login-email-error", "Please enter a valid email address.");
      hasError = true;
    }

    // Validate password
    if (!password) {
      setFieldError(passwordInput, "login-password-error", "Please enter your password.");
      hasError = true;
    }

    if (hasError) {
      // Focus the first invalid input
      if (!email || !EMAIL_REGEX.test(email)) {
        emailInput.focus();
      } else {
        passwordInput.focus();
      }
      return;
    }

    // Submit credentials to backend
    setButtonLoading(submitBtn, true, "Logging in...");

    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: { email, password },
        auth: false,
      });

      // Save token and navigate to dashboard
      setToken(data.token);
      window.location.href = "dashboard.html";
    } catch (err) {
      setButtonLoading(submitBtn, false);

      if (err.status === 401) {
        showMessage(messageEl, "Invalid email or password.", "error");
      } else {
        showMessage(messageEl, err.message || "Something went wrong. Please try again.", "error");
      }

      // Clear password field for security
      passwordInput.value = "";
      passwordInput.focus();
    }
  });
}

/**
 * Configure Register form submission and validation.
 */
function setupRegisterForm() {
  const form = document.getElementById("register-form");
  const submitBtn = document.getElementById("register-submit-btn");
  const nameInput = document.getElementById("register-name");
  const emailInput = document.getElementById("register-email");
  const passwordInput = document.getElementById("register-password");
  const confirmPasswordInput = document.getElementById("register-confirm-password");
  const messageEl = document.getElementById("register-message");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAllFieldErrors(form);
    clearMessage(messageEl);

    const fullName = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    let hasError = false;

    // Validate Full Name (spec.md Appendix B item 7: 2–60 chars)
    if (!fullName) {
      setFieldError(nameInput, "register-name-error", "Please enter your full name.");
      hasError = true;
    } else if (fullName.length < 2 || fullName.length > 60) {
      setFieldError(nameInput, "register-name-error", "Full name must be between 2 and 60 characters.");
      hasError = true;
    }

    // Validate Email
    if (!email) {
      setFieldError(emailInput, "register-email-error", "Please enter your email address.");
      hasError = true;
    } else if (!EMAIL_REGEX.test(email) || email.length > 120) {
      setFieldError(emailInput, "register-email-error", "Please enter a valid email address.");
      hasError = true;
    }

    // Validate Password (spec.md Appendix B item 7: 6–100 chars)
    if (!password) {
      setFieldError(passwordInput, "register-password-error", "Please enter a password.");
      hasError = true;
    } else if (password.length < 6 || password.length > 100) {
      setFieldError(passwordInput, "register-password-error", "Password must be between 6 and 100 characters.");
      hasError = true;
    }

    // Validate Password Confirmation
    if (!confirmPassword) {
      setFieldError(confirmPasswordInput, "register-confirm-password-error", "Please confirm your password.");
      hasError = true;
    } else if (password !== confirmPassword) {
      setFieldError(confirmPasswordInput, "register-confirm-password-error", "Passwords do not match.");
      hasError = true;
    }

    if (hasError) {
      // Focus first error field
      if (!fullName || fullName.length < 2 || fullName.length > 60) {
        nameInput.focus();
      } else if (!email || !EMAIL_REGEX.test(email)) {
        emailInput.focus();
      } else if (!password || password.length < 6 || password.length > 100) {
        passwordInput.focus();
      } else {
        confirmPasswordInput.focus();
      }
      return;
    }

    // Submit registration to backend
    setButtonLoading(submitBtn, true, "Creating account...");

    try {
      await apiRequest("/auth/register", {
        method: "POST",
        body: {
          full_name: fullName,
          email: email,
          password: password,
        },
        auth: false,
      });

      // After successful registration, automatically log in and open Dashboard (spec.md section 5 & AC-01)
      try {
        const loginData = await apiRequest("/auth/login", {
          method: "POST",
          body: { email, password },
          auth: false,
        });

        setToken(loginData.token);
        window.location.href = "dashboard.html";
      } catch {
        // Fallback: switch to login tab with email prefilled
        setButtonLoading(submitBtn, false);
        const tabLogin = document.getElementById("tab-login");
        if (tabLogin) tabLogin.click();

        const loginEmailInput = document.getElementById("login-email");
        if (loginEmailInput) loginEmailInput.value = email;

        showMessage("login-message", "Account created successfully! Please log in.", "success");
      }
    } catch (err) {
      setButtonLoading(submitBtn, false);

      if (err.status === 409) {
        showMessage(messageEl, "This email is already registered. Please log in.", "error");
      } else {
        showMessage(messageEl, err.message || "Something went wrong. Please try again.", "error");
      }
    }
  });
}
