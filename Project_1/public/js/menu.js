// Fetch username from server API
async function loadUser() {
  const token = localStorage.getItem('token');
  
  // Temporarily disabled for testing
  // if (!token) {
  //   window.location.href = 'login.html';
  //   return;
  // }
  
  if (!token) {
    document.getElementById('username').textContent = 'Guest';
    return;
  }
  
  try {
    const response = await fetch('http://localhost:5000/api/user', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    if (response.ok) {
      const data = await response.json();
      document.getElementById('username').textContent = data.user.username;
    } else {
      // Token invalid - redirect to login
      localStorage.removeItem('token');
      window.location.href = 'login.html';
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    document.getElementById('username').textContent = 'User';
  }
}

// Load user on page load
loadUser();

// ============ QR Tampering Alert System ============

// Alert types for QR code manipulation detection
const ALERT_TYPES = {
  QR_MANIPULATION: 'qr_manipulation',      // Photoshop/image editing detected
  DOCUMENT_MISMATCH: 'document_mismatch',  // QR scanned for wrong document
  HASH_MISMATCH: 'hash_mismatch',          // Signature hash doesn't match
  MULTIPLE_SCANS: 'multiple_scans',        // Suspicious scan pattern
  EXPIRED_QR: 'expired_qr'                 // QR code timestamp expired
};

// Update alert count badge
function updateAlertCount() {
  const alertItems = document.querySelectorAll('.alert-item');
  const countBadge = document.getElementById('alertCount');
  if (countBadge) {
    countBadge.textContent = alertItems.length;
  }
}

// View alert details
function viewAlertDetails(alertId) {
  // TODO: Implement modal or navigate to alert detail page
  console.log('Viewing alert:', alertId);
  alert(`Alert Details\n\nAlert ID: ${alertId}\n\nThis would open a detailed view showing:\n- Full scan history\n- Device fingerprint\n- Geographic location\n- Original vs tampered QR comparison\n- Recommended actions`);
}

// Dismiss an alert
function dismissAlert(alertId) {
  const alertElement = document.querySelector(`[data-alert-id="${alertId}"]`);
  if (alertElement) {
    alertElement.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => {
      alertElement.remove();
      updateAlertCount();
    }, 300);
  }
}

// Fetch alerts from server (mock for now)
async function loadSecurityAlerts() {
  try {
    const token = localStorage.getItem('token');
    // TODO: Replace with actual API endpoint
    // const response = await fetch('http://localhost:5000/api/alerts', {
    //   headers: { 'Authorization': 'Bearer ' + token }
    // });
    // const alerts = await response.json();
    // renderAlerts(alerts);
    
    // For now, just update the count from static HTML
    updateAlertCount();
  } catch (error) {
    console.error('Error loading security alerts:', error);
  }
}

// Render alerts dynamically
function renderAlerts(alerts) {
  const alertsList = document.getElementById('alertsList');
  if (!alertsList) return;
  
  alertsList.innerHTML = alerts.map(alert => `
    <div class="alert-item alert-${alert.severity}" data-alert-id="${alert.id}">
      <div class="alert-icon">${getAlertIcon(alert.type)}</div>
      <div class="alert-content">
        <div class="alert-title">${alert.title}</div>
        <div class="alert-details">
          <span class="alert-doc">Document ID: ${alert.documentId}</span>
          <span class="alert-type">Type: ${alert.typeDescription}</span>
        </div>
        <div class="alert-meta">
          <span class="alert-time">${formatTimeAgo(alert.timestamp)}</span>
          <span class="alert-ip">IP: ${alert.ipAddress}</span>
        </div>
      </div>
      <button class="alert-action" onclick="viewAlertDetails('${alert.id}')">View</button>
    </div>
  `).join('');
  
  updateAlertCount();
}

// Get appropriate icon for alert type
function getAlertIcon(type) {
  const icons = {
    [ALERT_TYPES.QR_MANIPULATION]: '⚠️',
    [ALERT_TYPES.DOCUMENT_MISMATCH]: '🔄',
    [ALERT_TYPES.HASH_MISMATCH]: '🚨',
    [ALERT_TYPES.MULTIPLE_SCANS]: 'ℹ️',
    [ALERT_TYPES.EXPIRED_QR]: '⏰'
  };
  return icons[type] || '⚠️';
}

// Format timestamp to relative time
function formatTimeAgo(timestamp) {
  const now = new Date();
  const alertTime = new Date(timestamp);
  const diffMs = now - alertTime;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

// Initialize alerts on page load
loadSecurityAlerts();
