/**
 * api.js — Shared API client and authentication token management.
 * 
 * Responsibilities (spec.md sections 12, 13, 22):
 *  - Manages the login token in localStorage under the key 'campusconnect_token'.
 *  - Provides apiRequest() for same-origin relative API requests.
 *  - Automatically attaches the 'Authorization: Bearer <token>' header.
 *  - Handles network/server failure gracefully.
 *  - Handles 401 unauthorized responses (clears token & redirects to index.html).
 */

const TOKEN_KEY = "campusconnect_token";

/**
 * Retrieve the current login token from localStorage.
 * @returns {string|null} The token string or null if not logged in.
 */
function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (err) {
    console.error("Failed to read token from localStorage:", err);
    return null;
  }
}

/**
 * Save the login token to localStorage.
 * @param {string} token - The login token string.
 */
function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (err) {
    console.error("Failed to write token to localStorage:", err);
  }
}

/**
 * Remove the login token from localStorage.
 */
function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    console.error("Failed to clear token from localStorage:", err);
  }
}

/**
 * Check whether a token currently exists in localStorage.
 * @returns {boolean}
 */
function isAuthenticated() {
  return Boolean(getToken());
}

/**
 * Guard function for protected pages (Dashboard, Create Issue, Issue Details, Profile).
 * If no token is present, redirects the student to the Login / Register page.
 */
function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = "index.html";
  }
}

/**
 * Perform a same-origin API request with automatic header and error management.
 * 
 * @param {string} endpoint - The relative API path (e.g. "/auth/login", "/issues").
 * @param {Object} options - Request options (method, headers, body, auth).
 * @returns {Promise<any>} The parsed response data (JSON, null for 204).
 * @throws {Error} Throws an error object with .message, .status, and .data.
 */
async function apiRequest(endpoint, options = {}) {
  const config = { ...options };
  const headers = { ...config.headers };

  // Attach token unless explicitly disabled via options.auth = false
  const token = getToken();
  if (token && config.auth !== false) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // If request body is a plain object, JSON-encode it and set header
  if (config.body && typeof config.body === "object" && !(config.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    config.body = JSON.stringify(config.body);
  }

  config.headers = headers;

  let response;
  try {
    response = await fetch(endpoint, config);
  } catch (networkErr) {
    // Backend unreachable or network failure
    const error = new Error("Cannot reach the server. Please check that it is running and try again.");
    error.status = 0;
    error.isNetworkError = true;
    throw error;
  }

  // Handle 204 No Content (e.g. POST /auth/logout)
  if (response.status === 204) {
    return null;
  }

  // Parse JSON response body if present
  let data = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await response.text();
    } catch {
      data = null;
    }
  }

  // Handle error responses
  if (!response.ok) {
    let message = "Something went wrong. Please try again.";

    if (data && typeof data === "object") {
      if (typeof data.detail === "string") {
        message = data.detail;
      } else if (Array.isArray(data.detail)) {
        // FastAPI / Pydantic validation error list
        message = data.detail.map((err) => err.msg || "Validation error").join(", ");
      }
    } else if (typeof data === "string" && data.trim()) {
      message = data;
    }

    // Handle 401 Unauthorized
    if (response.status === 401) {
      // If unauthorized on an authenticated request, clear invalid token
      if (token) {
        clearToken();
      }
      // Redirect to login if on a protected page
      const currentPath = window.location.pathname;
      const isAuthPage = currentPath.endsWith("index.html") || currentPath === "/" || currentPath.endsWith("/");
      if (!isAuthPage) {
        window.location.href = "index.html";
      }
    }

    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
