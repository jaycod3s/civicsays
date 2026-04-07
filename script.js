<!-- OFFICIAL FLOATING CHAT BOX (Bottom Right Corner) -->
<div id="officialFloatingChat" class="official-floating-chat" style="display: none;">
  <div class="floating-chat-header">
    <div class="floating-chat-title">
      <span>💬 Chat with Resident</span>
      <span id="floatingChatResidentName"></span>
    </div>
    <div class="floating-chat-actions">
      <button class="resolve-chat-btn" onclick="resolveCurrentInquiry()">✓ Resolved</button>
      <button class="minimize-chat-btn" onclick="minimizeFloatingChat()">−</button>
      <button class="close-chat-btn" onclick="closeFloatingChat()">✕</button>
    </div>
  </div>
  <div id="floatingChatMessages" class="floating-chat-messages">
    <div class="loading-messages">Loading messages...</div>
  </div>
  <div class="floating-chat-input">
    <input type="text" id="floatingChatInput" placeholder="Type your message...">
    <button onclick="sendFloatingChatMessage()">Send</button>
  </div>
</div>
