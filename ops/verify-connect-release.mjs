import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

/** HTTP200 may still be the previous release's SPA fallback during CDN propagation. */
export function verifyConnectReleaseText(text, expectedSha) {
  if (typeof expectedSha !== 'string' || !/^[a-f0-9]{40}$/.test(expectedSha)) return false;
  try {
    const value = JSON.parse(text);
    return value !== null && !Array.isArray(value) && value.schemaVersion === 1 &&
      value.product === 'nestjourney' && value.releaseSha === expectedSha;
  } catch { return false; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let valid = false;
  try { valid = verifyConnectReleaseText(fs.readFileSync(process.argv[2], 'utf8'), process.env.GITHUB_SHA); } catch { /* Generic nonzero; never log response bodies. */ }
  process.exit(valid ? 0 : 1);
}
