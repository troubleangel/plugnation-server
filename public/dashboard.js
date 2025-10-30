const socket = io(); // Connect to server

// DOM Elements
const totalPayments = document.getElementById('totalPayments');
const totalRevenue = document.getElementById('totalRevenue');
const clientList = document.getElementById('clientList');
const hostingList = document.getElementById('hostingList');
const notificationList = document.getElementById('notificationList');

// Utility
function addItem(list, text) {
  const li = document.createElement('li');
  li.textContent = text;
  list.prepend(li); // newest first
}

// Fetch initial data
async function loadInitialData() {
  try {
    const resStats = await fetch('/api/stats');
    const stats = await resStats.json();
    totalPayments.textContent = stats.payments || 0;
    totalRevenue.textContent = stats.revenue || 0;

    const resClients = await fetch('/api/clients');
    const clients = await resClients.json();
    clientList.innerHTML = '';
    clients.forEach(c => addItem(clientList, `${c.name} - ${c.tier} - $${c.revenueGenerated}`));

    const resHosting = await fetch('/api/hosting');
    const hostings = await resHosting.json();
    hostingList.innerHTML = '';
    hostings.forEach(h => addItem(hostingList, `${h.domain} - ${h.plan} - ${h.status}`));

    const resNotifications = await fetch('/api/notifications');
    const notifs = await resNotifications.json();
    notificationList.innerHTML = '';
    notifs.forEach(n => addItem(notificationList, `${n.title}: ${n.message}`));
  } catch (err) {
    console.error('Failed to load initial data', err);
  }
}
loadInitialData();

// Socket.IO listeners
socket.on('paymentSuccess', ({ client, payment, stats }) => {
  totalPayments.textContent = stats.payments;
  totalRevenue.textContent = stats.revenue;
  addItem(clientList, `${client.name} - ${client.tier} - $${client.revenueGenerated}`);
  addItem(notificationList, `Payment received: ${client.name} - $${payment.amount}`);
});

socket.on('tierChanged', ({ client }) => {
  addItem(clientList, `${client.name} upgraded to ${client.tier}`);
  addItem(notificationList, `${client.name} tier changed to ${client.tier}`);
});

socket.on('hostingCreated', ({ hosting, client }) => {
  addItem(hostingList, `${hosting.domain} - ${hosting.plan} - ${hosting.status}`);
  addItem(notificationList, `New hosting created for ${client.name}: ${hosting.domain}`);
});

socket.on('hostingUpdated', ({ hosting, client }) => {
  addItem(hostingList, `${hosting.domain} updated - ${hosting.plan} - ${hosting.status}`);
  addItem(notificationList, `Hosting updated for ${client.name}: ${hosting.domain}`);
});

socket.on('hostingDeleted', ({ hostingId, client }) => {
  addItem(notificationList, `Hosting deleted for ${client.name} (ID: ${hostingId})`);
  // Optionally refresh hosting list
  loadInitialData();
});

// God Mode Upsell notification
window.addEventListener('DOMContentLoaded', () => {
  const notice = document.createElement('div');
  notice.style = 'background:#111;color:#fff;border:2px solid #00ff88;padding:12px 30px;text-align:center;position:fixed;top:25px;left:50%;transform:translateX(-50%);z-index:99;border-radius:16px;font-size:1.1em;box-shadow:0 8px 32px #0008;';
  notice.innerHTML = '🚀 <b>PlugNation Money Flow Active!</b> &nbsp; See <a href="/pricing.html" style="color:#00ff88;font-weight:bold;text-decoration:underline;">Pricing Packages</a> and <a href="/services.html" style="color:#00c4ff;font-weight:bold;text-decoration:underline;">Services</a>.';
  document.body.appendChild(notice);
  setTimeout(()=>notice.remove(), 8000);
});