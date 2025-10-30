import axios from 'axios';

// Minimal Cloudflare DNS A-record helper
// Set CF_API_TOKEN, CF_ZONE_ID, and CF_TARGET_IP in env to enable; otherwise this is a no-op.
const CF_API = 'https://api.cloudflare.com/client/v4';

export async function ensureARecord(hostname) {
  const token = process.env.CF_API_TOKEN;
  const zoneId = process.env.CF_ZONE_ID;
  const targetIp = process.env.CF_TARGET_IP;
  if (!token || !zoneId || !targetIp) return false; // not configured

  try {
    // Check existing records
    const list = await axios.get(`${CF_API}/zones/${zoneId}/dns_records`, {
      params: { type: 'A', name: hostname },
      headers: { Authorization: `Bearer ${token}` }
    });
    const found = list.data?.result?.[0];
    if (found) {
      if (found.content === targetIp) return true;
      await axios.put(`${CF_API}/zones/${zoneId}/dns_records/${found.id}`,
        { type: 'A', name: hostname, content: targetIp, ttl: 120, proxied: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return true;
    }
    // Create new record
    await axios.post(`${CF_API}/zones/${zoneId}/dns_records`,
      { type: 'A', name: hostname, content: targetIp, ttl: 120, proxied: true },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return true;
  } catch (e) {
    console.error('Cloudflare DNS error:', e.response?.data || e.message);
    return false;
  }
}
