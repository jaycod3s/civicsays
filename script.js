// Supabase Configuration
const SUPABASE_URL = 'https://gdovxbzzggdjwkbwsokp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkb3Z4Ynp6Z2dkandrYndzb2twIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzIyNDgsImV4cCI6MjA5MDI0ODI0OH0.L9na-M72r4BL030Uq-yrEBrpgDilMXeJIckaVqUhlR0';
const TABLE_NAME = 'tickets';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Official credentials
const OFFICIALS = [
  { username: 'admin', password: 'civic2024', fullName: 'System Administrator' },
  { username: 'juan', password: 'juan123', fullName: 'Juan Dela Cruz' },
  { username: 'pedro', password: 'pedro123', fullName: 'Pedro Reyes' },
  { username: 'maria', password: 'maria123', fullName: 'Maria Santos' }
];

// Global variables
let isOfficialLoggedIn = false;
let currentOfficialTab = 'all';
let currentMediaFile = null;

// Helper Functions
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

function showToast(msg, color = '#e67e22') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  toast.style.background = `linear-gradient(135deg, ${color}, ${color}cc)`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function generateTicketId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let id = 'CIV-';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

// Database Functions
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
  const existing = await getTicketById(ticket.id);
  
  if (existing) {
    const { error } = await supabaseClient
      .from(TABLE_NAME)
      .update({
        name: ticket.name,
        phone: ticket.phone,
        email: ticket.email,
        type: ticket.type,
        type_id: ticket.typeId,
        location: ticket.location,
        title: ticket.title,
        description: ticket.description,
        media: ticket.media,
        media_type: ticket.mediaType,
        video_url: ticket.videoUrl,
        status: ticket.status,
        comments: ticket.comments,
        resolved_at: ticket.resolvedAt
      })
      .eq('id', ticket.id);
    if (error) throw error;
  } else {
    const { error } = await supabaseClient
      .from(TABLE_NAME)
      .insert([{
        id: ticket.id,
        name: ticket.name,
        phone: ticket.phone,
        email: ticket.email,
        type: ticket.type,
        type_id: ticket.typeId,
        location: ticket.location,
        title: ticket.title,
        description: ticket.description,
        media: ticket.media,
        media_type: ticket.mediaType,
        video_url: ticket.videoUrl,
        status: ticket.status,
        comments: ticket.comments || [],
        created_at: ticket.createdAt,
        resolved_at: ticket.resolvedAt
      }]);
    if (error) throw error;
  }
}

async function getAllTickets() {
  const { data, error } = await supabaseClient
    .from(TABLE_NAME)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  return data;
}

// Official Functions
async function loadOfficialTickets() {
  if (!isOfficialLoggedIn) return;
  
  let tickets = await getAllTickets();
  
  const searchTerm = document.getElementById('officialSearchInput')?.value.toLowerCase() || '';
  if (searchTerm) {
    tickets = tickets.filter(t => 
      t.id.toLowerCase().includes(searchTerm) ||
      t.name.toLowerCase().includes(searchTerm) ||
      t.email.toLowerCase().includes(searchTerm) ||
      t.title.toLowerCase().includes(searchTerm)
    );
  }
  
  if (currentOfficialTab !== 'all') {
    tickets = tickets.filter(t => t.status === currentOfficialTab);
  }
  
  const allTickets = await getAllTickets();
  const total = allTickets.length;
  const pending = allTickets.filter(t => t.status === 'pending').length;
  const inProcess = allTickets.filter(t => t.status === 'in_process').length;
  const solved = allTickets.filter(t => t.status === 'solved').length;
  
  document.getElementById('statTotal').textContent = total;
  document.getElementById('statPending').textContent = pending;
  document.getElementById('statInProcess').textContent = inProcess;
  document.getElementById('statSolved').textContent = solved;
  
  if (!tickets || tickets.length === 0) {
    document.getElementById('officialTicketsList').innerHTML = '<div class="empty-state">No tickets found</div>';
    return;
  }
  
  document.getElementById('officialTicketsList').innerHTML = tickets.map(ticket => `
    <div class="ticket-item" onclick="window.location.href='ticket.html?id=${ticket.id}'">
      <div class="ticket-header">
        <span class="ticket-id">${ticket.id}</span>
        <span class="type-badge">${ticket.type}</span>
        <span class="status-badge status-${ticket.status}">${getStatusText(ticket.status)}</span>
      </div>
      <div class="ticket-title">${escapeHtml(ticket.title)}</div>
      <div class="ticket-meta">
        <span>${escapeHtml(ticket.name)}</span>
        <span>${new Date(ticket.created_at).toLocaleDateString()}</span>
        <span>${escapeHtml(ticket.location)}</span>
      </div>
    </div>
  `).join('');
}

function searchOfficialTickets() { loadOfficialTickets(); }
function clearOfficialSearch() {
  document.getElementById('officialSearchInput').value = '';
  loadOfficialTickets();
}

function switchOfficialTab(event, tab) {
  currentOfficialTab = tab;
  document.querySelectorAll('#officialView .tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  loadOfficialTickets();
}

// Login Functions
function attemptLogin() {
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  const errorDiv = document.getElementById('loginError');
  
  const official = OFFICIALS.find(o => o.username === username && o.password === password);
  
  if (official) {
    isOfficialLoggedIn = true;
    localStorage.setItem('civicSaysOfficial', 'true');
    localStorage.setItem('officialName', official.fullName);
    
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('loginBtn').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'block';
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.innerHTML = `👤 ${official.fullName} | Logout`;
    }
    
    document.getElementById('officialView').style.display = 'block';
    document.getElementById('residentView').style.display = 'none';
    loadOfficialTickets();
    showToast(`Welcome ${official.fullName}!`, '#2ecc71');
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    errorDiv.textContent = '';
  } else {
    errorDiv.textContent = 'Invalid username or password';
  }
}

function logout() {
  isOfficialLoggedIn = false;
  localStorage.removeItem('civicSaysOfficial');
  localStorage.removeItem('officialName');
  
  document.getElementById('loginBtn').style.display = 'block';
  document.getElementById('logoutBtn').style.display = 'none';
  document.getElementById('officialView').style.display = 'none';
  document.getElementById('residentView').style.display = 'block';
  showToast('Logged out successfully');
}

function showLoginModal() {
  document.getElementById('loginModal').style.display = 'flex';
}

function checkLoginStatus() {
  const savedLogin = localStorage.getItem('civicSaysOfficial');
  if (savedLogin === 'true') {
    isOfficialLoggedIn = true;
    const officialName = localStorage.getItem('officialName');
    
    document.getElementById('loginBtn').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'block';
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn && officialName) {
      logoutBtn.innerHTML = `👤 ${officialName} | Logout`;
    }
    
    document.getElementById('officialView').style.display = 'block';
    document.getElementById('residentView').style.display = 'none';
    loadOfficialTickets();
  }
}

// Resident Functions
async function submitTicket(e) {
  e.preventDefault();
  
  const name = document.getElementById('residentName').value;
  const phone = document.getElementById('residentPhone').value;
  const email = document.getElementById('residentEmail').value;
  const type = document.getElementById('ticketType').value;
  const location = document.getElementById('ticketLocation').value;
  const title = document.getElementById('ticketTitle').value;
  const description = document.getElementById('ticketDescription').value;
  const videoLink = document.getElementById('videoLink').value;
  
  if (!name || !phone || !email || !type || !location || !title || !description) {
    alert('Please fill in all required fields');
    return;
  }
  
  let mediaData = null;
  let mediaType = null;
  if (currentMediaFile) {
    mediaData = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(currentMediaFile);
    });
    mediaType = currentMediaFile.type.startsWith('image/') ? 'image' : 'video';
  }
  
  const ticketId = generateTicketId();
  
  const newTicket = {
    id: ticketId,
    name, phone, email,
    type: type === 'request' ? 'Request' : 'Complaint',
    typeId: type,
    location, title, description,
    media: mediaData,
    mediaType: mediaType,
    videoUrl: videoLink,
    status: 'pending',
    comments: [],
    createdAt: new Date().toISOString(),
    resolvedAt: null
  };
  
  try {
    await saveTicket(newTicket);
    document.getElementById('successTrackingId').textContent = ticketId;
    document.getElementById('successModal').style.display = 'flex';
    document.getElementById('ticketForm').reset();
    currentMediaFile = null;
    document.getElementById('photoUpload').value = '';
    if (isOfficialLoggedIn) loadOfficialTickets();
  } catch (error) {
    console.error('Error submitting ticket:', error);
    alert('Error submitting ticket. Please try again.');
  }
}

async function searchTicketById() {
  const ticketId = document.getElementById('searchTicketId').value.trim().toUpperCase();
  if (!ticketId) {
    alert('Please enter a Ticket ID');
    return;
  }
  
  const resultDiv = document.getElementById('searchResult');
  resultDiv.innerHTML = '<div class="loading">Searching for ticket...</div>';
  
  const ticket = await getTicketById(ticketId);
  
  if (!ticket) {
    resultDiv.innerHTML = '<div class="empty-state">❌ Ticket not found. Please check your Ticket ID.</div>';
    return;
  }
  
  window.location.href = `ticket.html?id=${ticket.id}`;
}

function closeSuccessModal() {
  document.getElementById('successModal').style.display = 'none';
}

function closeFullscreenModal() {
  document.getElementById('fullscreenModal').style.display = 'none';
  document.body.style.overflow = 'auto';
}

// Event Listeners Setup
function setupEventListeners() {
  const photoUpload = document.getElementById('photoUpload');
  if (photoUpload) {
    photoUpload.addEventListener('change', (e) => {
      if (e.target.files[0]) currentMediaFile = e.target.files[0];
    });
  }
  
  const ticketForm = document.getElementById('ticketForm');
  if (ticketForm) {
    ticketForm.addEventListener('submit', submitTicket);
  }
  
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) loginBtn.addEventListener('click', showLoginModal);
  
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
  
  // Close modals on outside click
  window.onclick = (e) => {
    const loginModal = document.getElementById('loginModal');
    const successModal = document.getElementById('successModal');
    const fullscreenModal = document.getElementById('fullscreenModal');
    if (e.target === loginModal) loginModal.style.display = 'none';
    if (e.target === successModal) closeSuccessModal();
    if (e.target === fullscreenModal) closeFullscreenModal();
  };
}

// Initialize
function initCivicSays() {
  setupEventListeners();
  checkLoginStatus();
  console.log('CivicSays initialized with Supabase');
}

// Make functions global for HTML onclick
window.searchTicketById = searchTicketById;
window.switchOfficialTab = switchOfficialTab;
window.searchOfficialTickets = searchOfficialTickets;
window.clearOfficialSearch = clearOfficialSearch;
window.attemptLogin = attemptLogin;
window.closeSuccessModal = closeSuccessModal;
window.closeFullscreenModal = closeFullscreenModal;
