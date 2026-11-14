// Mirrors the harvested Pages artifact into the deploy repo, keeping its .git intact.
// No rsync on this host, so delete-and-copy with git as the recovery net.
const fs = require('node:fs');
const path = require('node:path');

const SRC = path.resolve(process.argv[2] || '.pages-site');
const DEST = path.resolve(process.argv[3] || '../pages-deploy');

if (!fs.existsSync(path.join(SRC, 'index.html'))) {
  console.error(`refusing to sync: ${SRC} has no index.html`);
  process.exit(1);
}
if (!fs.existsSync(path.join(DEST, '.git'))) {
  console.error(`refusing to sync: ${DEST} is not a git worktree`);
  process.exit(1);
}

let removed = 0;
for (const entry of fs.readdirSync(DEST, { withFileTypes: true })) {
  if (entry.name === '.git') continue;
  fs.rmSync(path.join(DEST, entry.name), { recursive: true, force: true });
  removed++;
}

fs.cpSync(SRC, DEST, { recursive: true });

const count = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).reduce((n, e) => (e.name === '.git' ? n : n + (e.isDirectory() ? count(path.join(dir, e.name)) : 1)), 0);

console.log(`removed ${removed} top-level entries, copied from ${SRC}`);
console.log(`files in ${DEST}: ${count(DEST)} | .nojekyll: ${fs.existsSync(path.join(DEST, '.nojekyll'))}`);
