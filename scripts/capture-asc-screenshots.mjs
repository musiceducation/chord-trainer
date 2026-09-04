import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const developerDir = '/Applications/Xcode.app/Contents/Developer';
const derived = '/tmp/chord-trainer-screenshot-dd';
const bundleId = 'com.musiceducation.chordtrainer';

const devices = {
  iphone: {
    udid: '61716187-9191-4741-811F-7BF7EB094C5A',
    folder: 'iphone-6.7',
    native: [1320, 2868],
    asc: [1290, 2796],
    waitMs: 8000,
  },
  ipad: {
    udid: '717E01A0-FFEF-498C-A1AA-13BA708CFF54',
    folder: 'ipad-12.9',
    native: [2064, 2752],
    asc: [2048, 2732],
    waitMs: 12000,
  },
};

const shots = [
  { file: '02-recognition-piano.png', shot: { tab: 'test', lang: 'zh-Hant' } },
  { file: '03-ear-training.png', shot: { tab: 'ear', lang: 'zh-Hant' } },
  { file: '05-progression.png', shot: { tab: 'progression', lang: 'zh-Hant' } },
  { file: '04-stats-achievements.png', shot: { tab: 'stats', lang: 'zh-Hant', seedStats: true } },
  { file: '06-settings-support.png', shot: { tab: 'test', lang: 'zh-Hant', settings: true } },
];

function run(command, cwd = root) {
  execSync(command, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, DEVELOPER_DIR: developerDir },
  });
}

function injectShot(indexPath, shot) {
  let html = readFileSync(indexPath, 'utf8');
  html = html.replace(/\n?\s*<script>window\.__SHOT__=[\s\S]*?<\/script>/, '');
  html = html.replace('<head>', `<head>\n    <script>window.__SHOT__=${JSON.stringify(shot)}</script>`);
  writeFileSync(indexPath, html);
}

function sleep(ms) {
  execSync(`sleep ${ms / 1000}`);
}

const appPath = join(derived, 'Build/Products/Debug-iphonesimulator/App.app');
const indexPath = join(appPath, 'public/index.html');

run('npm run build');
run('npx cap copy ios');
run('pod install', join(root, 'ios/App'));
run(`xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath ${derived} CODE_SIGNING_ALLOWED=NO build`, join(root, 'ios/App'));

for (const device of Object.values(devices)) {
  run(`xcrun simctl boot ${device.udid} || true`);
  run(`xcrun simctl bootstatus ${device.udid} -b`);
  const outDir = join(root, 'docs/app-store/screenshots', device.folder);
  const ascDir = join(outDir, 'asc-sized');
  mkdirSync(ascDir, { recursive: true });

  for (const item of shots) {
    injectShot(indexPath, item.shot);
    run(`xattr -cr "${appPath}"`);
    run(`codesign --force --sign - --timestamp=none "${appPath}"`);
    run(`xcrun simctl install ${device.udid} "${appPath}"`);
    run(`xcrun simctl terminate ${device.udid} ${bundleId} || true`);
    run(`xcrun simctl launch ${device.udid} ${bundleId}`);
    sleep(device.waitMs);
    const dest = join(outDir, item.file);
    run(`xcrun simctl io ${device.udid} screenshot "${dest}"`);
    const ascDest = join(ascDir, item.file);
    copyFileSync(dest, ascDest);
    run(`sips -z ${device.asc[1]} ${device.asc[0]} "${ascDest}"`);
  }
}

console.log('Screenshots written to docs/app-store/screenshots/');
