import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HOSTED_DIR = path.join(process.cwd(), 'hosted_clients');

router.get('/:clientId', (req, res) => {
  const clientFolder = path.join(HOSTED_DIR, req.params.clientId);
  const indexFile = path.join(clientFolder, 'index.html');

  if (fs.existsSync(indexFile)) res.sendFile(indexFile);
  else res.status(404).send('Client site not found');
});

export default router;
