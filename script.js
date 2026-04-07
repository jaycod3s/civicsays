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

// Inquiry/Chat variables
let currentInquiryId = null;
let currentChatSubscription = null;
let currentResidentName = '';
let currentResidentPhone = '';

// Floating Chat variables
let currentFloatingInquiryId = null;
let floatingChatSubscription = null;

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
  
  const statTotal = document.getElementById('statTotal');
  const statPending = document.getElementById('statPending');
  const statInProcess = document.getElementById('statInProcess');
  const statSolved = document.getElementById('statSolved');
  
  if (statTotal) statTotal.textContent = total;
  if (statPending) statPending.textContent = pending;
  if (statInProcess) statInProcess.textContent = inProcess;
  if (statSolved) statSolved.textContent = solved;
  
  const officialTicketsList = document.getElementById('officialTicketsList');
  if (!officialTicketsList) return;
  
  if (!tickets || tickets.length === 0) {
    officialTicketsList.innerHTML = '<div class="empty-state">No tickets found</div>';
    return;
  }
  
  officialTicketsList.innerHTML = tickets.map(ticket => `
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
  const input = document.getElementById('officialSearchInput');
  if (input) input.value = '';
  loadOfficialTickets();
}

function switchOfficialTab(event, tab) {
  currentOfficialTab = tab;
  const tabs = document.querySelectorAll('#officialView .tab');
  tabs.forEach(t => t.classList.remove('active'));
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
    
    const loginModal = document.getElementById('loginModal');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const officialView = document.getElementById('officialView');
    const residentView = document.getElementById('residentView');
    
    if (loginModal) loginModal.style.display = 'none';
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) {
      logoutBtn.style.display = 'block';
      logoutBtn.innerHTML = `👤 ${official.fullName} | Logout`;
    }
    if (officialView) officialView.style.display = 'block';
    if (residentView) residentView.style.display = 'none';
    
    loadOfficialTickets();
    loadInquiries();
    showToast(`Welcome ${official.fullName}!`, '#2ecc71');
    
    const loginUsername = document.getElementById('loginUsername');
    const loginPassword = document.getElementById('loginPassword');
    if (loginUsername) loginUsername.value = '';
    if (loginPassword) loginPassword.value = '';
    if (errorDiv) errorDiv.textContent = '';
  } else {
    if (errorDiv) errorDiv.textContent = 'Invalid username or password';
  }
}

function logout() {
  isOfficialLoggedIn = false;
  localStorage.removeItem('civicSaysOfficial');
  localStorage.removeItem('officialName');
  
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const officialView = document.getElementById('officialView');
  const residentView = document.getElementById('residentView');
  
  if (loginBtn) loginBtn.style.display = 'block';
  if (logoutBtn) logoutBtn.style.display = 'none';
  if (officialView) officialView.style.display = 'none';
  if (residentView) residentView.style.display = 'block';
  
  showToast('Logged out successfully');
}

function showLoginModal() {
  const loginModal = document.getElementById('loginModal');
  if (loginModal) loginModal.style.display = 'flex';
}

function checkLoginStatus() {
  const savedLogin = localStorage.getItem('civicSaysOfficial');
  if (savedLogin === 'true') {
    isOfficialLoggedIn = true;
    const officialName = localStorage.getItem('officialName');
    
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const officialView = document.getElementById('officialView');
    const residentView = document.getElementById('residentView');
    
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) {
      logoutBtn.style.display = 'block';
      logoutBtn.innerHTML = `👤 ${officialName} | Logout`;
    }
    if (officialView) officialView.style.display = 'block';
    if (residentView) residentView.style.display = 'none';
    
    loadOfficialTickets();
    loadInquiries();
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
    const successTrackingId = document.getElementById('successTrackingId');
    const successModal = document.getElementById('successModal');
    if (successTrackingId) successTrackingId.textContent = ticketId;
    if (successModal) successModal.style.display = 'flex';
    
    const ticketForm = document.getElementById('ticketForm');
    const photoUpload = document.getElementById('photoUpload');
    if (ticketForm) ticketForm.reset();
    currentMediaFile = null;
    if (photoUpload) photoUpload.value = '';
    
    if (isOfficialLoggedIn) loadOfficialTickets();
  } catch (error) {
    console.error('Error submitting ticket:', error);
    alert('Error submitting ticket. Please try again.');
  }
}

async function searchTicketById() {
  const ticketIdInput = document.getElementById('searchTicketId');
  if (!ticketIdInput) return;
  
  const ticketId = ticketIdInput.value.trim().toUpperCase();
  if (!ticketId) {
    alert('Please enter a Ticket ID');
    return;
  }
  
  const resultDiv = document.getElementById('searchResult');
  if (resultDiv) resultDiv.innerHTML = '<div class="loading">Searching for ticket...</div>';
  
  const ticket = await getTicketById(ticketId);
  
  if (!ticket) {
    if (resultDiv) resultDiv.innerHTML = '<div class="empty-state">❌ Ticket not found. Please check your Ticket ID.</div>';
    return;
  }
  
  window.location.href = `ticket.html?id=${ticket.id}`;
}

function closeSuccessModal() {
  const successModal = document.getElementById('successModal');
  if (successModal) successModal.style.display = 'none';
}

// ==================== ASK A QUESTION FUNCTIONS (Resident) ====================

function openChatBox() {
  const chatOverlay = document.getElementById('chatOverlay');
  if (chatOverlay) chatOverlay.style.display = 'flex';
  resetChatBox();
}

function closeChatBox() {
  const chatOverlay = document.getElementById('chatOverlay');
  if (chatOverlay) chatOverlay.style.display = 'none';
  if (currentChatSubscription) {
    currentChatSubscription.unsubscribe();
  }
  resetChatBox();
}

function resetChatBox() {
  const chatStep1 = document.getElementById('chatStep1');
  const chatStep2 = document.getElementById('chatStep2');
  const chatWaiting = document.getElementById('chatWaiting');
  const chatMessages = document.getElementById('chatMessages');
  const chatResolved = document.getElementById('chatResolved');
  const chatName = document.getElementById('chatName');
  const chatPhone = document.getElementById('chatPhone');
  const chatSubject = document.getElementById('chatSubject');
  const chatQuestion = document.getElementById('chatQuestion');
  
  if (chatStep1) chatStep1.style.display = 'block';
  if (chatStep2) chatStep2.style.display = 'none';
  if (chatWaiting) chatWaiting.style.display = 'none';
  if (chatMessages) chatMessages.style.display = 'none';
  if (chatResolved) chatResolved.style.display = 'none';
  if (chatName) chatName.value = '';
  if (chatPhone) chatPhone.value = '';
  if (chatSubject) chatSubject.value = '';
  if (chatQuestion) chatQuestion.value = '';
  
  currentInquiryId = null;
}

function goToStep2() {
  const name = document.getElementById('chatName').value.trim();
  const phone = document.getElementById('chatPhone').value.trim();
  if (!name || !phone) {
    showToast('Please enter your name and phone number');
    return;
  }
  currentResidentName = name;
  currentResidentPhone = phone;
  
  const chatStep1 = document.getElementById('chatStep1');
  const chatStep2 = document.getElementById('chatStep2');
  if (chatStep1) chatStep1.style.display = 'none';
  if (chatStep2) chatStep2.style.display = 'block';
}

async function submitInquiry() {
  const subject = document.getElementById('chatSubject').value.trim();
  const question = document.getElementById('chatQuestion').value.trim();
  
  if (!subject || !question) {
    showToast('Please fill in subject and question');
    return;
  }
  
  const { data, error } = await supabaseClient
    .from('inquiries')
    .insert({
      resident_name: currentResidentName,
      phone_number: currentResidentPhone,
      subject: subject,
      question: question,
      status: 'waiting'
    })
    .select()
    .single();
  
  if (error) {
    showToast('Error submitting inquiry: ' + error.message);
    return;
  }
  
  currentInquiryId = data.id;
  
  const chatStep2 = document.getElementById('chatStep2');
  const chatWaiting = document.getElementById('chatWaiting');
  if (chatStep2) chatStep2.style.display = 'none';
  if (chatWaiting) chatWaiting.style.display = 'block';
  
  subscribeToInquiryStatus(currentInquiryId);
  loadInquiries();
}

function subscribeToInquiryStatus(inquiryId) {
  supabaseClient
    .channel(`inquiry_${inquiryId}`)
    .on('postgres_changes', 
      { event: 'UPDATE', schema: 'public', table: 'inquiries', filter: `id=eq.${inquiryId}` },
      (payload) => {
        if (payload.new.status === 'active') {
          const chatWaiting = document.getElementById('chatWaiting');
          const chatMessages = document.getElementById('chatMessages');
          const chatMessagesList = document.getElementById('chatMessagesList');
          
          if (chatWaiting) chatWaiting.style.display = 'none';
          if (chatMessages) chatMessages.style.display = 'flex';
          if (chatMessagesList) chatMessagesList.innerHTML = '<div class="waiting-message">✨ You are now connected to an official ✨</div>';
          
          loadChatMessages(inquiryId);
          subscribeToChatMessages(inquiryId);
        } else if (payload.new.status === 'resolved') {
          const chatWaiting = document.getElementById('chatWaiting');
          const chatMessages = document.getElementById('chatMessages');
          const chatResolved = document.getElementById('chatResolved');
          
          if (chatWaiting) chatWaiting.style.display = 'none';
          if (chatMessages) chatMessages.style.display = 'none';
          if (chatResolved) chatResolved.style.display = 'block';
          
          if (currentChatSubscription) {
            currentChatSubscription.unsubscribe();
          }
        }
      }
    )
    .subscribe();
}

async function loadChatMessages(inquiryId) {
  const { data, error } = await supabaseClient
    .from('chat_messages')
    .select('*')
    .eq('inquiry_id', inquiryId)
    .order('created_at', { ascending: true });
  
  if (error) return;
  
  const messagesList = document.getElementById('chatMessagesList');
  if (!messagesList) return;
  
  if (data.length === 0) {
    messagesList.innerHTML = '<div class="waiting-message">Start the conversation...</div>';
  } else {
    messagesList.innerHTML = data.map(msg => `
      <div class="chat-message ${msg.sender === 'resident' ? 'resident' : 'official'}">
        ${escapeHtml(msg.message)}
      </div>
    `).join('');
    messagesList.scrollTop = messagesList.scrollHeight;
  }
}

function subscribeToChatMessages(inquiryId) {
  if (currentChatSubscription) {
    currentChatSubscription.unsubscribe();
  }
  
  currentChatSubscription = supabaseClient
    .channel(`chat_${inquiryId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `inquiry_id=eq.${inquiryId}` },
      (payload) => {
        const messagesList = document.getElementById('chatMessagesList');
        if (!messagesList) return;
        
        const newMsg = `
          <div class="chat-message ${payload.new.sender === 'resident' ? 'resident' : 'official'}">
            ${escapeHtml(payload.new.message)}
          </div>
        `;
        messagesList.insertAdjacentHTML('beforeend', newMsg);
        messagesList.scrollTop = messagesList.scrollHeight;
      }
    )
    .subscribe();
}

async function sendChatMessage() {
  if (!currentInquiryId) return;
  
  const input = document.getElementById('chatMessageInput');
  if (!input) return;
  
  const message = input.value.trim();
  if (!message) return;
  
  const { error } = await supabaseClient
    .from('chat_messages')
    .insert({
      inquiry_id: currentInquiryId,
      sender: 'resident',
      message: message
    });
  
  if (!error) {
    input.value = '';
  }
}

// ==================== OFFICIAL INQUIRY FUNCTIONS ====================

async function loadInquiries() {
  const { data, error } = await supabaseClient
    .from('inquiries')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) return;
  
  const waiting = data.filter(i => i.status === 'waiting').length;
  const active = data.filter(i => i.status === 'active').length;
  const solved = data.filter(i => i.status === 'resolved').length;
  
  const waitingEl = document.getElementById('inquiriesWaiting');
  const activeEl = document.getElementById('inquiriesActive');
  const solvedEl = document.getElementById('inquiriesSolved');
  
  if (waitingEl) waitingEl.textContent = waiting;
  if (activeEl) activeEl.textContent = active;
  if (solvedEl) solvedEl.textContent = solved;
  
  const listContainer = document.getElementById('inquiriesList');
  if (!listContainer) return;
  
  if (data.length === 0) {
    listContainer.innerHTML = '<div class="loading-placeholder">No inquiries yet</div>';
  } else {
    listContainer.innerHTML = data.map(inquiry => {
      let statusText = '';
      let statusClass = '';
      if (inquiry.status === 'waiting') {
        statusText = '⏳ Waiting';
        statusClass = '';
      } else if (inquiry.status === 'active') {
        statusText = '💬 Active';
        statusClass = 'active';
      } else {
        statusText = '✅ Solved';
        statusClass = 'solved';
      }
      
      return `
        <div class="inquiry-item" onclick="openFloatingChat('${inquiry.id}', '${escapeHtml(inquiry.resident_name)}', '${escapeHtml(inquiry.subject)}')">
          <div class="inquiry-subject">${escapeHtml(inquiry.subject)}</div>
          <div class="inquiry-question">${escapeHtml(inquiry.question.length > 100 ? inquiry.question.substring(0, 100) + '...' : inquiry.question)}</div>
          <div class="inquiry-meta">
            <span>👤 ${escapeHtml(inquiry.resident_name)}</span>
            <span>📞 ${escapeHtml(inquiry.phone_number)}</span>
            <span class="inquiry-status ${statusClass}">${statusText}</span>
          </div>
        </div>
      `;
    }).join('');
  }
}

function openFloatingChat(inquiryId, residentName, subject) {
  currentFloatingInquiryId = inquiryId;
  
  const chatBox = document.getElementById('officialFloatingChat');
  const residentNameSpan = document.getElementById('floatingChatResidentName');
  
  if (residentNameSpan) {
    residentNameSpan.innerHTML = `${escapeHtml(residentName)} | ${escapeHtml(subject)}`;
  }
  
  if (chatBox) {
    chatBox.style.display = 'flex';
    chatBox.classList.remove('minimized');
  }
  
  // Update status to active if waiting
  updateInquiryStatus(inquiryId, 'active');
  
  loadFloatingChatMessages(inquiryId);
  subscribeToFloatingChat(inquiryId);
}

async function updateInquiryStatus(inquiryId, status) {
  const { data: inquiry } = await supabaseClient
    .from('inquiries')
    .select('status')
    .eq('id', inquiryId)
    .single();
  
  if (inquiry && inquiry.status === 'waiting') {
    await supabaseClient
      .from('inquiries')
      .update({ status: status, updated_at: new Date().toISOString() })
      .eq('id', inquiryId);
    loadInquiries();
  }
}

function closeFloatingChat() {
  const chatBox = document.getElementById('officialFloatingChat');
  if (chatBox) chatBox.style.display = 'none';
  
  if (floatingChatSubscription) {
    floatingChatSubscription.unsubscribe();
  }
  currentFloatingInquiryId = null;
}

function minimizeFloatingChat() {
  const chatBox = document.getElementById('officialFloatingChat');
  if (chatBox) chatBox.classList.toggle('minimized');
}

async function loadFloatingChatMessages(inquiryId) {
  const { data, error } = await supabaseClient
    .from('chat_messages')
    .select('*')
    .eq('inquiry_id', inquiryId)
    .order('created_at', { ascending: true });
  
  if (error) return;
  
  const container = document.getElementById('floatingChatMessages');
  if (!container) return;
  
  if (data.length === 0) {
    container.innerHTML = '<div class="waiting-message">No messages yet. Start the conversation!</div>';
  } else {
    container.innerHTML = data.map(msg => `
      <div class="chat-message ${msg.sender === 'resident' ? 'resident' : 'official'}">
        ${escapeHtml(msg.message)}
      </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
  }
}

function subscribeToFloatingChat(inquiryId) {
  if (floatingChatSubscription) {
    floatingChatSubscription.unsubscribe();
  }
  
  floatingChatSubscription = supabaseClient
    .channel(`floating_chat_${inquiryId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `inquiry_id=eq.${inquiryId}` },
      (payload) => {
        const container = document.getElementById('floatingChatMessages');
        if (!container) return;
        
        const newMsg = `
          <div class="chat-message ${payload.new.sender === 'resident' ? 'resident' : 'official'}">
            ${escapeHtml(payload.new.message)}
          </div>
        `;
        container.insertAdjacentHTML('beforeend', newMsg);
        container.scrollTop = container.scrollHeight;
      }
    )
    .subscribe();
}

async function sendFloatingChatMessage() {
  if (!currentFloatingInquiryId) return;
  
  const input = document.getElementById('floatingChatInput');
  if (!input) return;
  
  const message = input.value.trim();
  if (!message) return;
  
  const { error } = await supabaseClient
    .from('chat_messages')
    .insert({
      inquiry_id: currentFloatingInquiryId,
      sender: 'official',
      message: message
    });
  
  if (!error) {
    input.value = '';
  }
}

async function resolveCurrentInquiry() {
  if (!currentFloatingInquiryId) return;
  
  const currentOfficial = localStorage.getItem('officialName') || 'System';
  
  // Add final message
  await supabaseClient
    .from('chat_messages')
    .insert({
      inquiry_id: currentFloatingInquiryId,
      sender: 'official',
      message: 'This inquiry has been resolved. Thank you!'
    });
  
  // Update inquiry status
  await supabaseClient
    .from('inquiries')
    .update({ 
      status: 'resolved', 
      resolved_by: currentOfficial,
      updated_at: new Date().toISOString() 
    })
    .eq('id', currentFloatingInquiryId);
  
  // Delete chat messages to save storage
  await supabaseClient
    .from('chat_messages')
    .delete()
    .eq('inquiry_id', currentFloatingInquiryId);
  
  // Close chat and refresh
  closeFloatingChat();
  loadInquiries();
  showToast('Inquiry resolved successfully');
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
  
  // Enter key to send message in floating chat
  document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      const floatingChat = document.getElementById('officialFloatingChat');
      if (floatingChat && floatingChat.style.display === 'flex') {
        const input = document.getElementById('floatingChatInput');
        if (document.activeElement === input) {
          e.preventDefault();
          sendFloatingChatMessage();
        }
      }
    }
  });
  
  // Close modals on outside click
  window.onclick = (e) => {
    const loginModal = document.getElementById('loginModal');
    const successModal = document.getElementById('successModal');
    if (e.target === loginModal && loginModal) loginModal.style.display = 'none';
    if (e.target === successModal && successModal) closeSuccessModal();
  };
}

// Initialize
function initCivicSays() {
  setupEventListeners();
  checkLoginStatus();
  
  // Auto-refresh inquiries every 5 seconds for officials
  setInterval(() => {
    if (isOfficialLoggedIn) {
      loadInquiries();
    }
  }, 5000);
}

// Make functions global for HTML onclick
window.searchTicketById = searchTicketById;
window.switchOfficialTab = switchOfficialTab;
window.searchOfficialTickets = searchOfficialTickets;
window.clearOfficialSearch = clearOfficialSearch;
window.attemptLogin = attemptLogin;
window.closeSuccessModal = closeSuccessModal;
window.openChatBox = openChatBox;
window.closeChatBox = closeChatBox;
window.goToStep2 = goToStep2;
window.submitInquiry = submitInquiry;
window.sendChatMessage = sendChatMessage;
window.openFloatingChat = openFloatingChat;
window.closeFloatingChat = closeFloatingChat;
window.minimizeFloatingChat = minimizeFloatingChat;
window.sendFloatingChatMessage = sendFloatingChatMessage;
window.resolveCurrentInquiry = resolveCurrentInquiry;
