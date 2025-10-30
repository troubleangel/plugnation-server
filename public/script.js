// 🚀 PLUGNATION GOD MODE 2026 — Live Dashboard + Monetization
const API_BASE_URL = window.location.origin;
let currentData = {};
const socket = io(API_BASE_URL); // Live updates via Socket.IO

// ------------------------------
// Initialization
// ------------------------------
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    startLiveClock();
    loadDashboardData();
});

// ------------------------------
// Dashboard Init
// ------------------------------
function initializeDashboard() {
    console.log('%c🚀 PLUGNATION STUDIOS Dashboard Initialized', 'color: #8b5cf6; font-weight: bold; font-size: 16px;');
}

// ------------------------------
// Live Clock
// ------------------------------
function startLiveClock() {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const updateClock = () => {
        const now = new Date();
        const day = days[now.getDay()];
        const h = String(now.getHours()).padStart(2,'0');
        const m = String(now.getMinutes()).padStart(2,'0');
        const s = String(now.getSeconds()).padStart(2,'0');
        document.getElementById('live-clock').textContent = `${day} ${h}:${m}:${s}`;
    };
    updateClock();
    setInterval(updateClock, 1000);
}

// ------------------------------
// Load Dashboard Data
// ------------------------------
async function loadDashboardData(retries = 3) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/dashboard`);
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        currentData = data;

        updateClientsDisplay(data.clients);
        updateAnalyticsDisplay(data.analytics);
        updateNotificationsDisplay(data.notifications);
        generateChart(data.analytics.chartData);
    } catch(err) {
        console.error('%cError loading dashboard data:', 'color:#ef4444;', err);
        if(retries > 0) setTimeout(() => loadDashboardData(retries-1), 1000);
        else showToast('error','Failed to load dashboard data.');
    }
}

// ------------------------------
// Socket.IO — Live Events
// ------------------------------
socket.on('paymentSuccess', data => {
    showToast('success', `Payment completed: ${data.client.name} $${data.payment.amount}`);
    loadDashboardData();
});

socket.on('tierChanged', data => {
    showToast('success', `${data.client.name} upgraded to ${data.client.tier}`);
    loadDashboardData();
});

// ------------------------------
// Clients Display
// ------------------------------
function updateClientsDisplay(clients) {
    const container = document.getElementById('clients-container');
    if(!clients?.length){ 
        container.innerHTML = '<div class="client-card">No clients found</div>'; 
        return; 
    }

    container.innerHTML = clients.map(c => `
        <div class="client-card ${c.tier==='Premium'?'premium-glow':''}" data-id="${c._id}">
            <div class="client-name">${c.name}</div>
            <div class="client-tier">Tier: ${c.tier}</div>
            <div class="client-joined">Joined: ${new Date(c.joined).toLocaleDateString()}</div>
            <button class="upgrade-btn">${c.tier==='Premium'?'Downgrade':'Upgrade to Premium'}</button>
        </div>
    `).join('');

    // Animate premium glow
    document.querySelectorAll('.client-card').forEach(card => {
        const tierText = card.querySelector('.client-tier').textContent;
        if(tierText.includes('Premium')) card.classList.add('premium-glow');
        else card.classList.remove('premium-glow');
    });
}

// ------------------------------
// Upgrade / Downgrade Client
// ------------------------------
document.body.addEventListener('click', async e => {
    const card = e.target.closest('.client-card');
    if(card && e.target.matches('.upgrade-btn')){
        const id = card.dataset.id;
        const client = currentData.clients?.find(c => c._id === id);
        if(!client) return;
        const newTier = client.tier === 'Premium' ? 'Free' : 'Premium';
        if(confirm(`Change ${client.name} to ${newTier}?`)){
            try {
                const res = await fetch(`${API_BASE_URL}/api/clients/${id}/tier`, {
                    method:'PUT',
                    headers:{'Content-Type':'application/json'},
                    body:JSON.stringify({tier:newTier})
                });
                if(!res.ok) throw new Error('Failed');
                showToast('success', `${client.name} is now ${newTier}`);
                loadDashboardData();
            } catch {
                showToast('error','Tier update failed');
            }
        }
    }
});

// ------------------------------
// Analytics Display
// ------------------------------
function updateAnalyticsDisplay(a) {
    document.getElementById('visits-count').textContent = a?.visits ?? 0;
    document.getElementById('pending-count').textContent = a?.pending ?? 0;
    document.getElementById('new-clients-count').textContent = a?.newClients ?? 0;
    document.getElementById('payments-count').textContent = a?.payments ?? 0;
    document.getElementById('revenue-count').textContent = a?.revenue ?? 0;
}

// ------------------------------
// Notifications Display
// ------------------------------
function updateNotificationsDisplay(notifications) {
    const container = document.getElementById('notifications-container');
    if(!notifications?.length){
        container.innerHTML='<div class="notification">No notifications</div>';
        return;
    }

    container.innerHTML = notifications.map(n => `
        <div class="notification" data-id="${n._id}" data-type="${n.type}">
            <div class="notification-icon icon-${n.type}">
                <i class="fas ${n.type==='premium'?'fa-crown': n.type==='free'?'fa-user-plus':'fa-money-bill-wave'}"></i>
            </div>
            <div class="notification-content">
                <h4>${n.title}</h4>
                <p>${new Date(n.timestamp||n.time).toLocaleString()}</p>
            </div>
        </div>
    `).join('');
}

// ------------------------------
// Chart
// ------------------------------
function generateChart(chartData) {
    const container = document.getElementById('chart-container');
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    if(!chartData?.length){
        container.innerHTML='<div class="chart-empty">No chart data</div>';
        return;
    }

    container.innerHTML = chartData.map((v,i) => `
        <div class="chart-bar" style="height:0%" data-value="${v}">
            <div class="chart-label">${days[i]}</div>
        </div>
    `).join('');

    // Animate chart bars
    setTimeout(()=> {
        document.querySelectorAll('.chart-bar').forEach(bar => {
            bar.style.height = bar.dataset.value + '%';
        });
    },50);
}

// ------------------------------
// Toast Notifications
// ------------------------------
function showToast(type,msg){
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    document.body.appendChild(t);

    // Optional ding for premium events
    if(type==='success') new Audio('/sounds/ding.mp3').play().catch(()=>{});

    setTimeout(()=>t.remove(),3000);
}

// ------------------------------
// Navigation
// ------------------------------
document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', e=>{
    if(link.getAttribute('href')=='#'){
        e.preventDefault();
        switchPage(link.dataset.page, link);
    }
}));

function switchPage(page, clickedLink){
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    clickedLink?.classList.add('active');

    const titles = {dashboard:'Claim Your Throne', analytics:'Business Analytics', notifications:'System Notifications'};
    document.getElementById('page-title').textContent = titles[page]||'PLUGNATION STUDIOS';
}
