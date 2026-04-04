// Media HTML - CLICKABLE ATTACHMENT with small download icon
let mediaHtml = '';
if (ticket.media) {
  if (ticket.media_type === 'image') {
    mediaHtml = `
      <div class="media-container">
        <div class="info-label">Attachment</div>
        <div class="clickable-attachment" onclick="openAttachment('${ticket.media}', 'image')">
          <img src="${ticket.media}" alt="Attachment">
          <div class="attachment-overlay">🔍 Click to view full size</div>
        </div>
        <div class="download-row">
          <button class="btn-icon" onclick="downloadAttachment('${ticket.media}', '${ticket.id}_image.jpg')" title="Download Image">
            📥 Download
          </button>
        </div>
      </div>
    `;
  } else if (ticket.media_type === 'video') {
    mediaHtml = `
      <div class="media-container">
        <div class="info-label">Video Attachment</div>
        <video controls src="${ticket.media}" style="max-width: 100%; border-radius: 12px;"></video>
        <div class="download-row">
          <button class="btn-icon" onclick="downloadAttachment('${ticket.media}', '${ticket.id}_video.mp4')" title="Download Video">
            📥 Download
          </button>
        </div>
      </div>
    `;
  }
}
