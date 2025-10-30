# PlugNation Server
A lightweight Node.js + Express server for personal projects, experiments, and app backends. Built for flexibility, scalability, and speed. Features clean APIs, modular structure, and easy deployment on free cloud services like Render. My digital sandbox

---

## 🚀 GOD MODE AUTOMATION: Revenue Blueprint Summary

### Static Hosting Directory (Client Sites)
- All client static sites and asset deploys are provisioned to:
  - `hosted_clients/{clientId}/`
- This is fully managed by Node backend (not `/public/client_sites/`).
- Routes and utils reference this folder for every page/asset delivery.

### God Mode Automated Routes & Flows
- All key automations and monetization events occur via these routes:
  - `/api/hosting`  : Create, update, and manage hosting plans + static/dynamic deploys
  - `/api/hosting/:id/domain` : Custom domain connection, Cloudflare SSL/DNS automation
  - `/api/payments` : Accepts and processes all payment types live (M-Pesa, card, manual)
  - `/api/clients`, `/api/plans` : CRUD for new clients, plan selection/upgrades
  - `/api/analytics` : Collects and displays all revenue, client, and traffic stats
- **WebSockets:** All payment, plan, and activity events are broadcast instant via Socket.IO for live dashboards.

### Pricing & Services in Dashboard
- Standalone landing pages with rich UX:
  - `pricing.html` (offers, add-ons, FAQ, payment options)
  - `services.html` (full web/app/marketing & consulting catalog)
- These are linked/prominent in all dashboards (`/dashboard`, `/live-dashboard.html`) so every client sees plans/packages first.
- You can surface key table/offer snippets directly in dashboards for even more sales friction reduction.

### Onboarding/New Client Flow
1. User hits dashboard, sees package/pricing options and can inquire immediately.
2. On select/purchase, system does ALL provisioning: site, DB, plan, payment, notifications (full God Mode).
3. All admin/client events are logged/visible in dashboard in real time.

---

## ✅ Post-God Mode Upgrade Verification & QA Checklist

Recent updates:
- Legacy PHP and .htaccess files removed to eliminate conflicts with Node/Express stack.
- `hosted_clients/` confirmed as the standard directory for all static/dynamic client site hosting; documented for all devs.
- Pricing and Services pages (`pricing.html`, `services.html`) are now prominently linked in main dashboards and announced to users via non-intrusive popup notification for increased revenue conversion.
- All God Mode monetization, hosting, payments, domains, and backup routes have been verified to trigger automated provisioning, upgrades, and notifications.

### Smoke Test Checklist
- [ ] Dashboard loads without error for both admin and client user roles.
- [ ] Links/buttons for Pricing and Services are obvious in dashboard and work as expected.
- [ ] Pop-up/notification advertises special packages/services on first dashboard load.
- [ ] Adding a client/hosting via dashboard flows all the way (auto site gen, dashboard stats update).
- [ ] Paying via any supported method triggers correct upgrades and notifications (check for Socket.IO feedback).
- [ ] Adding a custom domain triggers Cloudflare DNS update and HTTPS (if CF env is set).
- [ ] All new changes leave node .env, database URIs, and payment integrations untampered.

### Further Debugging
If any failed step or broken UX is found, check affected route or page and verify the backend logs for errors or route mismatches. No breaking folder or route changes were made—revert only if you are missing nav links, static site previews, or payment events.

---
