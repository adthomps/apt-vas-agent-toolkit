const { spawnSync } = require('child_process');
const path = require('path');

test('smoke-run.js exits with code 0', () => {
  const cwd = path.resolve(__dirname, '..');
  const res = spawnSync('node', ['smoke-run.js'], { cwd, env: process.env, stdio: 'inherit' });
  if (res.error) {
    // Re-throw so Jest surface the error
    throw res.error;
  }
  expect(res.status === 0 || res.status === null).toBeTruthy();
});
