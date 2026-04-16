#!/usr/bin/env node
// scripts/watch-crack-images.js
// data/ 하위 모든 디렉토리를 감시 — 각 디렉토리별로 독립적인 순번 유지
// 새 하위 디렉토리가 생겨도 자동으로 감시 추가
// 실행방법
//   yarn watch:cracks
//   실행하면 data/ 하위 디렉토리를 모두 감시하고, JPG를 붙여넣을 때마다 0001.jpg, 0002.jpg, ... 순번으로 자동 변경됩니다.
//   종료는 Ctrl+C.

const fs   = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const JPG_RE   = /\.(jpg|jpeg)$/i;
const SEQ_RE   = /^\d{4}\.jpg$/i;

// ── 유틸 ─────────────────────────────────────────────────────────────────────

// 해당 디렉토리에서 현재 최대 순번 반환
function getMaxSeq(dir) {
  let max = 0;
  for (const f of fs.readdirSync(dir)) {
    const m = f.match(/^(\d{4})\.jpg$/i);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

// 파일을 해당 디렉토리의 다음 순번으로 이름 변경
function renameToNext(dir, filename) {
  if (!JPG_RE.test(filename)) return;
  if (SEQ_RE.test(filename))  return;

  const filePath = path.join(dir, filename);
  if (!fs.existsSync(filePath)) return;

  // 이름 충돌 방지를 위해 rename 직전에 최대값을 다시 읽음
  const newName = String(getMaxSeq(dir) + 1).padStart(4, '0') + '.jpg';
  const newPath = path.join(dir, newName);

  // 극단적 경쟁 상황 방어: 이미 같은 이름이 있으면 한 번 더 올림
  if (fs.existsSync(newPath)) {
    const newName2 = String(getMaxSeq(dir) + 1).padStart(4, '0') + '.jpg';
    fs.renameSync(filePath, path.join(dir, newName2));
    log(dir, `${filename}  →  ${newName2}`);
  } else {
    fs.renameSync(filePath, newPath);
    log(dir, `${filename}  →  ${newName}`);
  }
}

// 디렉토리에 이미 있는 미순번 파일 일괄 처리
function processExisting(dir) {
  const unnamed = fs.readdirSync(dir).filter(
    f => JPG_RE.test(f) && !SEQ_RE.test(f)
  );
  if (unnamed.length === 0) return;
  console.log(`[${dirLabel(dir)}] 기존 미순번 파일 ${unnamed.length}개 처리 중...`);
  for (const f of unnamed) renameToNext(dir, f);
}

// ── 감시 ─────────────────────────────────────────────────────────────────────

// 디렉토리별 debounce map: Map<dir, Map<filename, timerId>>
const pendingMap = new Map();

function onFileEvent(dir, filename) {
  if (!filename || !JPG_RE.test(filename)) return;
  if (SEQ_RE.test(filename)) return;

  if (!pendingMap.has(dir)) pendingMap.set(dir, new Map());
  const dirPending = pendingMap.get(dir);

  if (dirPending.has(filename)) clearTimeout(dirPending.get(filename));

  const timer = setTimeout(() => {
    dirPending.delete(filename);
    renameToNext(dir, filename);
  }, 600);

  dirPending.set(filename, timer);
}

// 단일 디렉토리에 watcher 등록
const watchers = new Map();

function watchDir(dir) {
  if (watchers.has(dir)) return; // 이미 감시 중

  processExisting(dir);

  const w = fs.watch(dir, { persistent: true }, (eventType, filename) => {
    if (eventType === 'rename') onFileEvent(dir, filename);
  });

  w.on('error', err => {
    console.error(`[${dirLabel(dir)}] 감시 오류: ${err.message}`);
    watchers.delete(dir);
  });

  watchers.set(dir, w);
  console.log(`  ▸ ${dirLabel(dir)}`);
}

// DATA_DIR 자체를 감시해서 새 하위 디렉토리 자동 추가
function watchDataRoot() {
  fs.watch(DATA_DIR, { persistent: true }, (eventType, name) => {
    if (!name) return;
    const fullPath = path.join(DATA_DIR, name);
    try {
      if (fs.statSync(fullPath).isDirectory() && !watchers.has(fullPath)) {
        console.log(`\n새 디렉토리 감지 — 감시 추가: ${name}`);
        watchDir(fullPath);
      }
    } catch { /* 삭제된 항목 무시 */ }
  });
}

// ── 로그 ─────────────────────────────────────────────────────────────────────

function dirLabel(dir) {
  return path.relative(DATA_DIR, dir) || path.basename(dir);
}

function log(dir, msg) {
  console.log(`[${dirLabel(dir)}] ✔  ${msg}`);
}

// ── 시작 ─────────────────────────────────────────────────────────────────────

if (!fs.existsSync(DATA_DIR)) {
  console.error(`data 디렉토리가 없습니다: ${DATA_DIR}`);
  process.exit(1);
}

console.log(`\n감시 시작: ${DATA_DIR}\n`);

// 현재 존재하는 모든 하위 디렉토리 등록
for (const name of fs.readdirSync(DATA_DIR)) {
  const fullPath = path.join(DATA_DIR, name);
  try {
    if (fs.statSync(fullPath).isDirectory()) watchDir(fullPath);
  } catch { /* 무시 */ }
}

// 새로 생기는 디렉토리도 자동 감시
watchDataRoot();

console.log(`\nJPG 파일을 붙여넣으면 해당 디렉토리 내에서 0001, 0002, ... 로 자동 변경됩니다.`);
console.log('종료: Ctrl + C\n');
