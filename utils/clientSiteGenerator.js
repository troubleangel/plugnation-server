import fs from 'fs';
import path from 'path';

const HOSTED_DIR = path.join(process.cwd(), 'hosted_clients');

export async function generateClientSite(clientId, clientName) {
  try {
    const clientFolder = path.join(HOSTED_DIR, clientId.toString());

    // 1️⃣ Create client folder if it doesn't exist
    if (!fs.existsSync(clientFolder)) fs.mkdirSync(clientFolder, { recursive: true });

    // 2️⃣ Create assets folder
    const assetsFolder = path.join(clientFolder, 'assets');
    if (!fs.existsSync(assetsFolder)) fs.mkdirSync(assetsFolder);

    // 3️⃣ Create default index.html
    const defaultHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${clientName} - Powered by PlugNation</title>
      <link rel="stylesheet" href="assets/style.css">
    </head>
    <body>
      <h1>Welcome to ${clientName}'s Live Site 🚀</h1>
      <p>Hosted automatically by PlugNation Studios God Mode 2026+</p>
      <script src="assets/main.js"></script>
    </body>
    </html>
    `;
    fs.writeFileSync(path.join(clientFolder, 'index.html'), defaultHTML);

    // 4️⃣ Create default style.css
    const defaultCSS = `
    body { font-family: Arial,sans-serif; text-align: center; margin-top: 50px; background:#0f0f0f; color:#00ffb3; }
    h1 { font-size: 2rem; }
    `;
    fs.writeFileSync(path.join(assetsFolder, 'style.css'), defaultCSS);

    // 5️⃣ Create default main.js
    const defaultJS = `
    console.log("🚀 ${clientName} site loaded - PlugNation God Mode active");
    `;
    fs.writeFileSync(path.join(assetsFolder, 'main.js'), defaultJS);

    console.log(`✅ Client site auto-generated: ${clientName} (${clientId})`);
    return true;
  } catch (err) {
    console.error('🛑 Error generating client site:', err);
    return false;
  }
}
