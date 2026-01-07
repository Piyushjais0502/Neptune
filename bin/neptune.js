#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

function usage() {
  console.log('Usage: neptune <file.todo>');
}

const todoFile = process.argv[2];

if (!todoFile) {
  usage();
  process.exit(1);
}

let electronExecutable;
try {
  // Works for local + global installs
  // eslint-disable-next-line import/no-extraneous-dependencies
  electronExecutable = require('electron');
} catch (e) {
  console.error('[neptune] Electron is not installed.');
  console.error('[neptune] Install dependencies first (e.g. `npm i -g neptune-todo`).');
  process.exit(1);
}

const mainScript = path.join(__dirname, '..', 'src', 'index.js');

const child = spawn(electronExecutable, [mainScript, todoFile], {
  stdio: 'inherit',
  windowsHide: false
});

child.on('close', (code) => {
  process.exit(code);
});