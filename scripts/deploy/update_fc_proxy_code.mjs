#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const depsRoot = process.env.FC_DEPLOY_DEPS || '/tmp/ai-person-fc-sdk/node_modules';
const FCClient = require(path.join(depsRoot, '@alicloud/fc2'));
const core = require(path.join(depsRoot, '@serverless-devs/core'));
const { ZipArchive } = require(path.join(depsRoot, 'archiver'));

const region = process.env.FC_REGION || 'ap-southeast-1';
const serviceName = process.env.FC_SERVICE || 'ai-person-agent';
const functionName = process.env.FC_FUNCTION || 'people';
const codeDir = path.resolve(process.env.FC_CODE_DIR || 'proxy');

function ensureFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }
}

async function zipDirectory(sourceDir, outFile) {
  await fs.promises.mkdir(path.dirname(outFile), { recursive: true });
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outFile);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on('close', resolve);
    archive.on('warning', reject);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

async function main() {
  ensureFile(path.join(codeDir, 'index.js'));
  ensureFile(path.join(codeDir, 'bootstrap'));

  const credential = await core.getCredential(process.env.FC_ACCESS || 'default');
  const client = new FCClient(credential.AccountID, {
    accessKeyID: credential.AccessKeyID,
    accessKeySecret: credential.AccessKeySecret,
    securityToken: credential.SecurityToken,
    region,
    secure: true,
    timeout: 600000,
  });

  const before = await client.getFunction(serviceName, functionName);
  const zipPath = path.join(os.tmpdir(), `ai-person-agent-fc-proxy-${Date.now()}.zip`);
  await zipDirectory(codeDir, zipPath);
  const zipSize = fs.statSync(zipPath).size;

  const updated = await client.updateFunction(serviceName, functionName, {
    withoutCodeLimit: true,
    code: { zipFile: zipPath },
    functionName,
    description: before.data.description,
    runtime: before.data.runtime,
    handler: before.data.handler,
    initializer: before.data.initializer,
    initializationTimeout: before.data.initializationTimeout,
    timeout: before.data.timeout,
    memorySize: before.data.memorySize,
    caPort: before.data.caPort,
    instanceType: before.data.instanceType,
    instanceConcurrency: before.data.instanceConcurrency,
    environmentVariables: before.data.environmentVariables,
    layers: before.data.layersArnV2 || before.data.layers,
  });

  console.log(JSON.stringify({
    serviceName,
    functionName,
    region,
    zipPath,
    zipSize,
    before: {
      codeSize: before.data.codeSize,
      codeChecksum: before.data.codeChecksum,
      lastModifiedTime: before.data.lastModifiedTime,
    },
    after: {
      codeSize: updated.data.codeSize,
      codeChecksum: updated.data.codeChecksum,
      lastModifiedTime: updated.data.lastModifiedTime,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
