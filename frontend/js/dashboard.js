/**
 * CampusConnect — Dashboard Logic
 * Follows spec.md sections 7.2, 12, 13, 16 and Member 3 requirements
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Verify authentication (redirects to index.html if token is absent)
  requireAuth();
  if (!isAuthenticated()) {
    return;
  }

  // 2. Render canonical navigation bar
  renderNavbar('dashboard');

  // 3. Load issues from the backend
  loadIssues();
});

/**
 * Fetches all campus issues from GET /issues and renders them.
 * Handles loading, empty, error, and success states.
 */
async function loadIssues() {
  const messageContainer = document.getElementById('dashboard-message');
  const issuesContainer = document.getElementById('issues-container');

  if (!messageContainer || !issuesContainer) {
    return;
  }

  // Set loading state
  issuesContainer.innerHTML = '';
  showLoading(messageContainer, 'Loading issues…');

  try {
    const issues = await apiRequest('/issues');

    // Clear loading message
    clearMessage(messageContainer);
    issuesContainer.innerHTML = '';

    // Handle empty state
    if (!issues || issues.length === 0) {
      renderEmptyState(issuesContainer);
      return;
    }

    // Render issues list
    issues.forEach((issue) => {
      const card = createIssueCard(issue);
      issuesContainer.appendChild(card);
    });
  } catch (error) {
    issuesContainer.innerHTML = '';
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
    retryBtn.onclick = () => loadIssues();

    messageContainer.appendChild(p);
    messageContainer.appendChild(retryBtn);
  }
}

/**
 * Renders an accessible empty state when no issues exist.
 * @param {HTMLElement} container
 */
function renderEmptyState(container) {
  const emptyBox = document.createElement('div');
  emptyBox.className = 'empty-state';
  emptyBox.style.gridColumn = '1 / -1';

  const heading = document.createElement('h3');
  heading.className = 'empty-state-title';
  heading.textContent = 'No issues yet';

  const text = document.createElement('p');
  text.className = 'text-muted';
  text.textContent = 'Be the first to report an issue on campus.';

  const actionLink = document.createElement('a');
  actionLink.className = 'btn btn-primary';
  actionLink.href = 'create-issue.html';
  actionLink.textContent = '+ New Issue';

  emptyBox.appendChild(heading);
  emptyBox.appendChild(text);
  emptyBox.appendChild(actionLink);

  container.appendChild(emptyBox);
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
 * Creates a single issue card DOM element safely using textContent.
 * Prevents HTML injection by never using innerHTML for user data.
 *
 * @param {Object} issue - The issue object from GET /issues
 * @returns {HTMLElement} The card element
 */
function createIssueCard(issue) {
  const card = document.createElement('article');
  card.className = 'card';
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.justifyContent = 'space-between';
  card.style.minHeight = '220px';
  card.style.wordBreak = 'break-word';

  // --- Header: Title and Status Badge ---
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'flex-start';
  header.style.justifyContent = 'space-between';
  header.style.gap = '12px';
  header.style.marginBottom = '12px';

  const title = document.createElement('h3');
  title.className = 'card-title';
  title.style.fontSize = '1.125rem';
  title.style.lineHeight = '1.35';
  title.style.margin = '0';
  title.style.wordBreak = 'break-word';
  title.textContent = issue.title || 'Untitled Issue';

  const statusWrap = document.createElement('div');
  statusWrap.innerHTML = createStatusBadge(issue.status);
  const statusBadge = statusWrap.firstElementChild;

  header.appendChild(title);
  if (statusBadge) {
    header.appendChild(statusBadge);
  }

  // --- Meta row: Category chip, ID, Date ---
  const meta = document.createElement('div');
  meta.style.display = 'flex';
  meta.style.flexWrap = 'wrap';
  meta.style.alignItems = 'center';
  meta.style.gap = '8px';
  meta.style.fontSize = '0.8125rem';
  meta.style.color = 'var(--color-muted)';
  meta.style.marginBottom = '12px';

  const categoryChip = createCategoryChip(issue.category);

  const idTag = document.createElement('span');
  idTag.style.fontWeight = '600';
  idTag.textContent = `#${issue.id}`;

  const dateSpan = document.createElement('span');
  dateSpan.textContent = formatDate(issue.created_at);

  meta.appendChild(categoryChip);
  meta.appendChild(idTag);
  if (issue.created_at) {
    meta.appendChild(dateSpan);
  }

  // --- Description preview ---
  const desc = document.createElement('p');
  desc.className = 'text-muted';
  desc.style.fontSize = '0.875rem';
  desc.style.lineHeight = '1.5';
  desc.style.margin = '0 0 16px 0';
  desc.style.display = '-webkit-box';
  desc.style.webkitLineClamp = '3';
  desc.style.webkitBoxOrient = 'vertical';
  desc.style.overflow = 'hidden';
  desc.style.wordBreak = 'break-word';
  desc.textContent = issue.description || 'No description provided.';

  // --- Top section grouping ---
  const topSection = document.createElement('div');
  topSection.appendChild(header);
  topSection.appendChild(meta);
  topSection.appendChild(desc);

  // --- Footer: Reporter & View Details Button ---
  const footer = document.createElement('div');
  footer.style.marginTop = 'auto';
  footer.style.paddingTop = '14px';
  footer.style.borderTop = '1px solid var(--color-border)';
  footer.style.display = 'flex';
  footer.style.alignItems = 'center';
  footer.style.justifyContent = 'space-between';
  footer.style.gap = '8px';

  const reporter = document.createElement('span');
  reporter.className = 'text-muted';
  reporter.style.fontSize = '0.8125rem';
  reporter.style.whiteSpace = 'nowrap';
  reporter.style.overflow = 'hidden';
  reporter.style.textOverflow = 'ellipsis';
  reporter.style.maxWidth = '160px';
  reporter.textContent = issue.reporter_name ? `By ${issue.reporter_name}` : 'By Anonymous';

  const viewBtn = document.createElement('a');
  viewBtn.className = 'btn btn-secondary btn-sm';
  viewBtn.href = `issue.html?id=${encodeURIComponent(issue.id)}`;
  viewBtn.textContent = 'View Details';
  viewBtn.setAttribute('aria-label', `View details for issue #${issue.id}: ${issue.title || 'Untitled Issue'}`);

  footer.appendChild(reporter);
  footer.appendChild(viewBtn);

  // Assemble Card
  card.appendChild(topSection);
  card.appendChild(footer);

  return card;
}
