/**
 * create-issue.js — Create Issue page logic.
 * 
 * Responsibilities (spec.md sections 7.3, 13, 22):
 *  - Enforces route protection via requireAuth() from api.js.
 *  - Renders navbar via renderNavbar("create-issue") from ui.js.
 *  - Fills category dropdown from GET /categories.
 *  - Validates title (3-100 chars), category (selected), and description (10-1000 chars).
 *  - Handles form submission via POST /issues (without sending reporter_id).
 *  - Redirects to issue.html?id=<id> on success.
 */

// Route protection & navigation bar initialization
requireAuth();
renderNavbar("create-issue");

const TITLE_MIN = 3;
const TITLE_MAX = 100;
const DESCRIPTION_MIN = 10;
const DESCRIPTION_MAX = 1000;

const form = document.getElementById("issue-form");
const titleInput = document.getElementById("title");
const categorySelect = document.getElementById("category");
const descriptionInput = document.getElementById("description");
const descriptionCount = document.getElementById("description-count");
const submitButton = document.getElementById("submit-button");

let isSubmitting = false;
let categoriesLoaded = false;

// ---------- Validation Helpers ----------

function checkTitle() {
  const length = titleInput.value.trim().length;
  if (length === 0) {
    return "Please enter a title.";
  }
  if (length < TITLE_MIN || length > TITLE_MAX) {
    return `Title must be between ${TITLE_MIN} and ${TITLE_MAX} characters.`;
  }
  return "";
}

function checkCategory() {
  return categorySelect.value === "" ? "Please select a category." : "";
}

function checkDescription() {
  const length = descriptionInput.value.trim().length;
  if (length === 0) {
    return "Please enter a description.";
  }
  if (length < DESCRIPTION_MIN || length > DESCRIPTION_MAX) {
    return `Description must be between ${DESCRIPTION_MIN} and ${DESCRIPTION_MAX} characters.`;
  }
  return "";
}

function validateTitle() {
  const error = checkTitle();
  if (error) {
    setFieldError(titleInput, "title-error", error);
    return false;
  }
  clearFieldError(titleInput, "title-error");
  return true;
}

function validateCategory() {
  const error = checkCategory();
  if (error) {
    setFieldError(categorySelect, "category-error", error);
    return false;
  }
  clearFieldError(categorySelect, "category-error");
  return true;
}

function validateDescription() {
  const error = checkDescription();
  if (error) {
    setFieldError(descriptionInput, "description-error", error);
    return false;
  }
  clearFieldError(descriptionInput, "description-error");
  return true;
}

function validateAll() {
  const titleOk = validateTitle();
  const categoryOk = validateCategory();
  const descriptionOk = validateDescription();
  return titleOk && categoryOk && descriptionOk;
}

function setSubmitEnabled() {
  submitButton.disabled = isSubmitting || !categoriesLoaded;
}

// ---------- Categories Loading ----------

async function loadCategories() {
  clearMessage("form-message");
  categoriesLoaded = false;
  categorySelect.disabled = true;
  categorySelect.replaceChildren(new Option("Loading categories…", ""));
  setSubmitEnabled();

  try {
    const categories = await apiRequest("/categories");

    if (!Array.isArray(categories) || categories.length === 0) {
      categorySelect.replaceChildren(new Option("No categories available", ""));
      showError("form-message", "No categories are available right now, so an issue cannot be created yet.");
      return;
    }

    categorySelect.replaceChildren(new Option("Select a category", ""));
    categories.forEach((name) => {
      categorySelect.appendChild(new Option(name, name));
    });
    categorySelect.disabled = false;
    categoriesLoaded = true;
  } catch (err) {
    categorySelect.replaceChildren(new Option("Categories unavailable", ""));
    showCategoryError(err);
  }
  setSubmitEnabled();
}

function showCategoryError(err) {
  const message = err.message || "Could not load categories. Please try again.";
  showError("form-message", message);

  const formMsgEl = document.getElementById("form-message");
  if (formMsgEl) {
    const retryBtn = document.createElement("button");
    retryBtn.type = "button";
    retryBtn.className = "btn btn-secondary btn-sm";
    retryBtn.style.marginTop = "8px";
    retryBtn.textContent = "Try again";
    retryBtn.addEventListener("click", loadCategories);
    formMsgEl.appendChild(document.createElement("br"));
    formMsgEl.appendChild(retryBtn);
  }
}

// ---------- Form Submission ----------

async function submitIssue(event) {
  event.preventDefault();
  if (isSubmitting) return;

  clearMessage("form-message");
  if (!validateAll()) {
    const firstInvalid = form.querySelector("[aria-invalid='true']");
    if (firstInvalid) firstInvalid.focus();
    return;
  }

  isSubmitting = true;
  setButtonLoading(submitButton, true, "Creating Issue...");

  // Send POST /issues without reporter_id (assigned by backend token)
  const body = {
    title: titleInput.value.trim(),
    description: descriptionInput.value.trim(),
    category: categorySelect.value,
  };

  try {
    const issue = await apiRequest("/issues", {
      method: "POST",
      body: body,
    });
    showSuccess("form-message", "Issue created! Opening it now…");
    window.location.href = `issue.html?id=${encodeURIComponent(issue.id)}`;
  } catch (err) {
    showError("form-message", err.message || "Something went wrong. Please try again.");
    isSubmitting = false;
    setButtonLoading(submitButton, false);
    setSubmitEnabled();
  }
}

// ---------- Event Listeners & Wiring ----------

function updateDescriptionCount() {
  descriptionCount.textContent = `${descriptionInput.value.length} / ${DESCRIPTION_MAX}`;
}

titleInput.addEventListener("blur", validateTitle);
categorySelect.addEventListener("blur", validateCategory);
categorySelect.addEventListener("change", validateCategory);
descriptionInput.addEventListener("blur", validateDescription);
descriptionInput.addEventListener("input", updateDescriptionCount);

titleInput.addEventListener("input", () => {
  if (titleInput.hasAttribute("aria-invalid")) validateTitle();
});

descriptionInput.addEventListener("input", () => {
  if (descriptionInput.hasAttribute("aria-invalid")) validateDescription();
});

form.addEventListener("submit", submitIssue);

// Load categories on page load
loadCategories();
