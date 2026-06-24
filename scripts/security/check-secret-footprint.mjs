#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const trackedFiles = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

const allowlistedFiles = new Set([
  '.env.example',
  'env.example',
]);

const blockedPathRules = [
  {
    id: 'tracked-env-file',
    test: (file) => /(^|\/)\.env($|\.)/.test(file) && !allowlistedFiles.has(file),
  },
  {
    id: 'tracked-vercel-local-config',
    test: (file) => file === '.vercel' || file.startsWith('.vercel/'),
  },
  {
    id: 'tracked-codex-local-config',
    test: (file) => file === '.codex' || file.startsWith('.codex/'),
  },
];

const contentRules = [
  {
    id: 'postgres-url-with-password',
    pattern: /postgres(?:ql)?:\/\/[^:\s"'`]+:[^@\s"'`]+@/i,
  },
  {
    id: 'supabase-service-role',
    pattern: /\bservice[_-]?role\b/i,
  },
  {
    id: 'private-key-material',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/,
  },
  {
    id: 'likely-openai-style-secret',
    pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/,
  },
];

const findings = [];

for (const file of trackedFiles) {
  for (const rule of blockedPathRules) {
    if (rule.test(file)) {
      findings.push({ file, line: 1, rule: rule.id });
    }
  }

  if (allowlistedFiles.has(file)) continue;

  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  const lines = content.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const rule of contentRules) {
      if (rule.pattern.test(line)) {
        findings.push({ file, line: index + 1, rule: rule.id });
      }
    }
  }
}

if (findings.length > 0) {
  console.error('Secret footprint check failed. Findings:');
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line} ${finding.rule}`);
  }
  process.exit(1);
}

console.log('Secret footprint check passed.');
