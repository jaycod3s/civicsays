// Supabase Configuration
const SUPABASE_URL = 'https://gdovxbzzggdjwkbwsokp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkb3Z4Ynp6Z2dkandrYndzb2twIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzIyNDgsImV4cCI6MjA5MDI0ODI0OH0.L9na-M72r4BL030Uq-yrEBrpgDilMXeJIckaVqUhlR0';
const TABLE_NAME = 'tickets';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Check if user is logged in as official
let isOfficialLoggedIn = localStorage.getItem('civicSaysOfficial') === 'true';
let officialName = localStorage.getItem('officialName');
let currentTicket = null;

// Get ticket ID from URL
const urlParams = new URLSearchParams(window.location.search);
const ticketId = urlParams.get('id');

function getStatusText(status) {
  const map = { 'pending': 'Pending', 'in_process': 'In Process', 'hold': 'On Hold', 'solved': 'Solved' };
  return map[status] || status;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

async function getTicketById(id) {
  const { data, error } = await supabaseClient
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

async function saveTicket(ticket) {
  const { error } = await supabaseClient
    .from(TABLE_NAME)
    .update({
      status: ticket.status,
      comments: ticket.comments
    })
    .eq('id', ticket.id);
  if (error) throw error;
}

function updateCommentsSection(comments) {
  const commentsContainer = document.querySelector('.comment-list');
  if (!commentsContainer) return;
  
  const commentsHtml = comments.length > 0 
    ? comments.map(c => `
      <div class="comment-item">
        <div class="comment-author">
          ${c.isOfficial ? '👔 ' + escapeHtml(c.authorName) : '👤 ' + escapeHtml(c.authorName)}
          ${c.isOfficial ? '<span class="official-badge">Government Official</span>' : ''}
        </div>
        <div class="comment-time">${new Date(c.timestamp).toLocaleString()}</div>
        <div class="comment-message">${escapeHtml(c.message)}</div>
      </div>
    `).join('') 
    : '<p style="color: rgba(255,255,255,0.5); text-align: center; padding: 20px;">No comments yet</p>';
  
  commentsContainer.innerHTML = commentsHtml;
}

function updateStatusSection(status) {
  const statusBadge = document.querySelector('.status-badge');
  const statusSelect = document.getElementById('statusSelect');
  
  if (statusBadge) {
    statusBadge.className = `status-badge status-${status}`;
    statusBadge.textContent = getStatusText(status);
  }
  
  if (statusSelect) {
    statusSelect.value = status;
  }
}

async function renderTicket() {
  const container = document.getElementById('ticketContainer');
  
  if (!ticketId) {
    container.innerHTML = `
      <div class="error-state">
        <h2>❌ No Ticket ID Provided</h2>
        <p style="margin-bottom: 24px;">Please go back and enter a valid ticket ID.</p>
        <a href="civicsays.html" class="btn btn-primary" style="display: inline-block; width: auto; padding: 12px 32px;">Go to Dashboard</a>
      </div>
    `;
    return;
  }
  
  const ticket = await getTicketById(ticketId);
  currentTicket = ticket;
  
  if (!ticket) {
    container.innerHTML = `
      <div class="error-state">
        <h2>❌ Ticket Not Found</h2>
        <p style="margin-bottom: 24px;">The ticket with ID "${ticketId}" does not exist.</p>
        <a href="civicsays.html" class="btn btn-primary" style="display: inline-block; width: auto; padding: 12px 32px;">Go to Dashboard</a>
      </div>
    `;
    return;
  }
  
  // Media HTML
  const mediaHtml = ticket.media ? `
    <div class="media-container">
      <div class="info-label">Attachment</div>
      ${ticket.media_type === 'image' 
        ? `<img src="${ticket.media}" alt="Attachment">` 
        : `<video controls src="${ticket.media}"></video>`}
    </div>
  ` : '';
  
  const videoHtml = ticket.video_url ? `
    <div class="media-container">
      <div class="info-label">Video Link</div>
      <a href="${ticket.video_url}" target="_blank" class="btn btn-outline" style="display: inline-block; width: auto; margin-top: 8px;">Watch Video →</a>
    </div>
  ` : '';
  
  // Comments HTML
  const comments = ticket.comments || [];
  const commentsHtml = comments.length > 0 
    ? comments.map(c => `
      <div class="comment-item">
        <div class="comment-author">
          ${c.isOfficial ? '👔 ' + escapeHtml(c.authorName) : '👤 ' + escapeHtml(c.authorName)}
          ${c.isOfficial ? '<span class="official-badge">Government Official</span>' : ''}
        </div>
        <div class="comment-time">${new Date(c.timestamp).toLocaleString()}</div>
        <div class="comment-message">${escapeHtml(c.message)}</div>
      </div>
    `).join('') 
    : '<p style="color: rgba(255,255,255,0.5); text-align: center; padding: 20px;">No comments yet</p>';
  
  // Build the layout
  const layoutHtml = `
    <div class="ticket-layout">
      <!-- LEFT COLUMN -->
      <div class="left-column">
        <div class="card">
          <div class="card-header">
            <h3>📋 TICKET INFORMATION</h3>
          </div>
          <div class="card-content">
            <div class="info-row">
              <div class="info-label">Ticket ID</div>
              <div class="info-value"><strong>${ticket.id}</strong></div>
            </div>
            <div class="info-row">
              <div class="info-label">Type</div>
              <div class="info-value"><span class="type-badge">${ticket.type}</span></div>
            </div>
            <div class="info-row">
              <div class="info-label">Status</div>
              <div class="info-value"><span class="status-badge status-${ticket.status}">${getStatusText(ticket.status)}</span></div>
            </div>
            <div class="info-row">
              <div class="info-label">Submitted</div>
              <div class="info-value">${new Date(ticket.created_at).toLocaleString()}</div>
            </div>
            ${isOfficialLoggedIn ? `
              <div style="margin-top: 24px; border-top: 1px solid rgba(230,126,34,0.2); padding-top: 20px;">
                <div class="info-label">Update Status</div>
                <select id="statusSelect" class="status-select">
                  <option value="pending" ${ticket.status === 'pending' ? 'selected' : ''}>Pending</option>
                  <option value="in_process" ${ticket.status === 'in_process' ? 'selected' : ''}>In Process</option>
                  <option value="hold" ${ticket.status === 'hold' ? 'selected' : ''}>On Hold</option>
                  <option value="solved" ${ticket.status === 'solved' ? 'selected' : ''}>Solved</option>
                </select>
                <button class="btn btn-primary" onclick="updateStatus('${ticket.id}')">Update Status</button>
              </div>
            ` : ''}
          </div>
        </div>
        
        <div class="card">
          <div class="card-header">
            <h3>📞 CONTACT INFORMATION</h3>
          </div>
          <div class="card-content">
            <div class="info-row">
              <div class="info-label">Name</div>
              <div class="info-value">👤 ${escapeHtml(ticket.name)}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Phone Number</div>
              <div class="info-value">📱 ${escapeHtml(ticket.phone)}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Email Address</div>
              <div class="info-value">✉️ ${escapeHtml(ticket.email)}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- MIDDLE COLUMN -->
      <div class="middle-column">
        <div class="card">
          <div class="card-header">
            <h3>📝 ISSUE DETAILS</h3>
          </div>
          <div class="card-content">
            <div class="info-row">
              <div class="info-label">Location / Address</div>
              <div class="info-value">📍 ${escapeHtml(ticket.location)}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Title</div>
              <div class="info-value"><strong>${escapeHtml(ticket.title)}</strong></div>
            </div>
            <div class="info-row">
              <div class="info-label">Description</div>
              <div class="info-value">${escapeHtml(ticket.description)}</div>
            </div>
            ${mediaHtml}
            ${videoHtml}
          </div>
        </div>
      </div>
      
      <!-- RIGHT COLUMN -->
      <div class="right-column">
        <div class="card">
          <div class="card-header">
            <h3>💬 COMMENTS</h3>
          </div>
          <div class="card-content">
            <div class="comment-list">${commentsHtml}</div>
            <textarea id="commentInput" class="comment-input" rows="3" placeholder="Write your comment here..."></textarea>
            <button class="btn btn-primary" onclick="addComment('${ticket.id}')">Post Comment</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  container.innerHTML = layoutHtml;
}

async function updateStatus(ticketId) {
  const status = document.getElementById('statusSelect').value;
  const ticket = currentTicket;
  if (!ticket) return;
  
  ticket.status = status;
  ticket.comments = ticket.comments || [];
  
  const officialNameFromStorage = localStorage.getItem('officialName') || 'System';
  
  ticket.comments.push({
    id: Date.now().toString(),
    authorName: officialNameFromStorage,
    message: `Status updated to: ${getStatusText(status)}`,
    isOfficial: true,
    timestamp: new Date().toISOString()
  });
  
  try {
    await saveTicket(ticket);
    showToast(`Status updated to ${getStatusText(status)}`);
    updateStatusSection(status);
    updateCommentsSection(ticket.comments);
  } catch (error) {
    showToast('Error updating status');
  }
}

async function addComment(ticketId) {
  const message = document.getElementById('commentInput')?.value;
  if (!message) {
    showToast('Please enter a comment');
    return;
  }
  
  const ticket = currentTicket;
  if (!ticket) return;
  
  let authorName = ticket.name;
  if (isOfficialLoggedIn) {
    const officialNameFromStorage = localStorage.getItem('officialName');
    authorName = officialNameFromStorage || 'Government Official';
  }
  
  ticket.comments = ticket.comments || [];
  ticket.comments.push({
    id: Date.now().toString(),
    authorName: authorName,
    message: message,
    isOfficial: isOfficialLoggedIn,
    timestamp: new Date().toISOString()
  });
  
  try {
    await saveTicket(ticket);
    showToast('Comment posted');
    document.getElementById('commentInput').value = '';
    updateCommentsSection(ticket.comments);
  } catch (error) {
    showToast('Error posting comment');
  }
}

// Make functions global
window.updateStatus = updateStatus;
window.addComment = addComment;

// Initialize
renderTicket();
