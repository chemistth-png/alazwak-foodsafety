import { execFileSync } from 'node:child_process';
const input = process.env.BASE_SHA;
const base = input && /^[a-f0-9]{40}$/i.test(input) && !/^0+$/.test(input) ? input : 'HEAD^';
const paths = execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMR', '-z', base, 'HEAD'], { encoding: 'utf8' })
  .split('\0').filter(path => /\.[jt]sx?$/.test(path));
if (paths.length) {
  execFileSync(process.execPath, ['node_modules/eslint/bin/eslint.js', '--max-warnings=0', '--', ...paths], { stdio: 'inherit' });
} else console.log('No changed JS/TS files');
