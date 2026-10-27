import { randomBytes } from 'node:crypto';
import { writeFile, access } from 'node:fs/promises';
const file = new URL('../.dev.vars', import.meta.url);
try { await access(file); console.log('.dev.vars already exists; it was left unchanged.'); }
catch {
  const secret = () => randomBytes(32).toString('hex');
  const body = `# Generated local-only credentials; ignored by git. No real Telegram traffic.\nLOCAL_DEV=true\nTELEGRAM_MOCK=true\nADMIN_PASSWORD=Fr!${secret()}\nSESSION_SECRET=${secret()}\nGOOGLE_FORMS_SECRET=${secret()}\nTELEGRAM_WEBHOOK_SECRET=${secret()}\nTURNSTILE_SITE_KEY=\n`;
  await writeFile(file, body, { flag: 'wx', mode: 0o600 });
  console.log('Created ignored .dev.vars with random local-only credentials. Read ADMIN_PASSWORD there for /admin.');
}
