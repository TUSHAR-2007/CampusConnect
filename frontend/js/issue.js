/**
 * CampusConnect — Issue Details & Status Update Logic
 * Follows spec.md sections 7.4, 10, 12, 13, 16 and Member 3 requirements
 */

let currentIssue = null;
let currentIssueId = null;

document.addEventListener('DOMContentLoaded', () => {
  // 1. Verify authentication (redirects to index.html if token missing)
  requireAuth();
  if (!isAuthenticated()) {
    return;
  }

  // 2. Render canonical top navigation bar
  renderNavbar('issue');

  // 3. Extract and validate issue ID from URL query parameters (?id=<issue_id>)
  const params = new URLSearchParams(window.location.search);
  const rawId = params.get('id');

  if (!rawId || rawId.trim() === '' || isNaN(Number(rawId)) || Number(rawId) <= 0) {
    showNotFoundState('This issue could not be found.');
    return;
  }

  currentIssueId = Number(rawId);

  // 4. Attach status update form listener
  const form = document.getElementById('status-update-form');
  if (form) {
    form.addEventListener('submit', handleStatusUpdate);
  }

  // 5. Load the issue details from GET /issues/{id}
  loadIssueDetails(currentIssueId);
});

/**
 * Loads issue details from the backend.
 * @param {number|string} id - Issue ID
 */
async function loadIssueDetails(id) {
  const messageContainer = document.getElementById('issue-message');
  const detailContainer = document.getElementById('issue-detail-container');

  if (!messageContainer || !detailContainer) {
    return;
  }

  // Set loading state and hide detail container
  detailContainer.style.display = 'none';
  clearMessage(messageContainer);
  showLoading(messageContainer, 'Loading issue details…');

  try {
    const issue = await apiRequest(`/issues/${encodeURIComponent(id)}`);

    if (!issue || !issue.id) {
      showNotFoundState('This issue could not be found.');
      return;
    }

    currentIssue = issue;
    clearMessage(messageContainer);
    renderIssueDetails(issue);
    detailContainer.style.display = 'block';
  } catch (error) {
    detailContainer.style.display = 'none';

    if (error.status === 404) {
      showNotFoundState('This issue could not be found.');
    } else {
      const errorText = error.message || 'Cannot reach the server. Please check that it is running and try again.';
      clearMessage(messageContainer);
      messageContainer.className = 'message-box message-error visible';
      messageContainer.innerHTML = '';

      const p = document.createElement('p');
      p.textContent = errorText;
      p.style.margin = '0 0 10px 0';

      const retryBtn = document.createElement('button');
      retryBtn.type = 'button';
      retryBtn.className = 'btn btn-sm btn-secondary';
      retryBtn.textContent = 'Try Again';
      retryBtn.onclick = () => loadIssueDetails(id);

      messageContainer.appendChild(p);
      messageContainer.appendChild(retryBtn);
    }
  }
}

/**
 * Creates a category chip element safely using textContent.
 * @param {string} category
 * @returns {HTMLSpanElement}
 */
function createCategoryChip(category) {
  const chip = document.createElement('span');
  chip.className = 'category-chip';
  chip.textContent = category || 'General';
  return chip;
}

/**
 * Safely populates the issue details elements using textContent to prevent XSS.
 * @param {Object} issue - The issue object from GET /issues/{id}
 */
function renderIssueDetails(issue) {
  // Update document title for context and accessibility
  document.title = `${issue.title || 'Issue'} — CampusConnect`;

  // Issue ID Tag
  const idTag = document.getElementById('issue-id-tag');
  if (idTag) {
    idTag.textContent = `#${issue.id}`;
  }

  // Category Chip
  const categoryContainer = document.getElementById('issue-category-container');
  if (categoryContainer) {
    categoryContainer.innerHTML = '';
    categoryContainer.appendChild(createCategoryChip(issue.category));
  }

  // Issue Title (Safe text insertion)
  const titleEl = document.getElementById('issue-title');
  if (titleEl) {
    titleEl.textContent = issue.title || 'Untitled Issue';
  }

  // Status Badge
  updateStatusBadge(issue.status);

  // Reporter Name
  const reporterEl = document.getElementById('issue-reporter');
  if (reporterEl) {
    reporterEl.textContent = issue.reporter_name || 'Anonymous';
  }

  // Submission Date
  const createdEl = document.getElementById('issue-created');
  if (createdEl) {
    createdEl.textContent = formatDate(issue.created_at);
  }

  // Last Updated Date
  const updatedEl = document.getElementById('issue-updated');
  if (updatedEl) {
    updatedEl.textContent = formatDate(issue.updated_at);
  }

  // Description Box (Preserves line breaks safely via textContent & CSS pre-wrap)
  const descEl = document.getElementById('issue-description');
  if (descEl) {
    descEl.textContent = issue.description || 'No description provided.';
  }

  // Set the status dropdown value to the current status
  const statusSelect = document.getElementById('status-select');
  if (statusSelect && issue.status) {
    statusSelect.value = issue.status;
  }

  // Clear any existing feedback messages
  const feedbackContainer = document.getElementById('status-update-feedback');
  if (feedbackContainer) {
    clearMessage(feedbackContainer);
  }
}

/**
 * Updates the displayed status badge DOM element.
 * @param {string} status - Current status ('Open', 'In Progress', 'Resolved')
 */
function updateStatusBadge(status) {
  const badgeContainer = document.getElementById('issue-status-badge-container');
  if (badgeContainer) {
    badgeContainer.innerHTML = createStatusBadge(status);
  }
}

/**
 * Handles status update form submission via PUT /issues/{id}/status.
 * @param {Event} event
 */
async function handleStatusUpdate(event) {
  event.preventDefault();

  if (!currentIssueId || !currentIssue) {
    return;
  }

  const statusSelect = document.getElementById('status-select');
  const updateBtn = document.getElementById('update-status-btn');
  const feedbackContainer = document.getElementById('status-update-feedback');

  if (!statusSelect || !updateBtn || !feedbackContainer) {
    return;
  }

  const selectedStatus = statusSelect.value;

  // Informative notice if student selects the same status already set
  if (selectedStatus === currentIssue.status) {
    showSuccess(feedbackContainer, `Status is already set to ${selectedStatus}.`);
    return;
  }

  // Disable controls and show progress indicator
  statusSelect.disabled = true;
  updateBtn.disabled = true;
  const originalBtnText = updateBtn.textContent;
  updateBtn.textContent = 'Updating…';
  clearMessage(feedbackContainer);

  try {
    const updated = await apiRequest(`/issues/${encodeURIComponent(currentIssueId)}/status`, {
      method: 'PUT',
      body: { status: selectedStatus }
    });

    // Update in-memory state
    currentIssue = updated;

    // Refresh UI elements
    updateStatusBadge(updated.status);

    const updatedEl = document.getElementById('issue-updated');
    if (updatedEl) {
      updatedEl.textContent = formatDate(updated.updated_at);
    }

    if (statusSelect) {
      statusSelect.value = updated.status;
    }

    // Show success feedback
    showSuccess(feedbackContainer, 'Status updated successfully.');
  } catch (error) {
    let errorMsg = 'Failed to update status. Please try again.';

    if (error.status === 404) {
      errorMsg = 'This issue could not be found.';
    } else if (error.status === 422) {
      errorMsg = 'Invalid status value. Allowed: Open, In Progress, Resolved.';
    } else if (error.message) {
      errorMsg = error.message;
    }

    showError(feedbackContainer, errorMsg);
  } finally {
    // Re-enable controls
    statusSelect.disabled = false;
    updateBtn.disabled = false;
    updateBtn.textContent = originalBtnText;
  }
}

/**
 * Shows an accessible "Not Found" state with a clear return link to the Dashboard.
 * @param {string} messageText
 */
function showNotFoundState(messageText) {
  const messageContainer = document.getElementById('issue-message');
  const detailContainer = document.getElementById('issue-detail-container');

  if (detailContainer) {
    detailContainer.style.display = 'none';
  }

  if (messageContainer) {
    clearMessage(messageContainer);
    messageContainer.className = 'message-box message-error visible';
    messageContainer.innerHTML = '';

    const p = document.createElement('p');
    p.textContent = messageText || 'This issue could not be found.';
    p.style.margin = '0 0 10px 0';

    const backBtn = document.createElement('a');
    backBtn.className = 'btn btn-sm btn-primary';
    backBtn.href = 'dashboard.html';
    backBtn.textContent = 'Back to Dashboard';

    messageContainer.appendChild(p);
    messageContainer.appendChild(backBtn);
  }
}
