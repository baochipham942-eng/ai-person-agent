---
description: 部署到阿里云 FC 生产环境 (Standard Golden Flow)
---

# 完整部署流程

## 架构说明

```
用户 → people.llmxy.xyz → 阿里云 FC (proxy) → Vercel (ai-person-agent.vercel.app)
```

| 层级 | 作用 | 部署方式 |
|------|------|----------|
| **Vercel** | 主应用 (Next.js API + 页面) | Git push 自动部署 |
| **阿里云 FC** | 反向代理 + 头像静态资源 | `s deploy -y --use-remote` |

## 部署步骤

// turbo-all

### 1. 代码检查
```bash
cd /Users/linchen/Downloads/ai/ai-person-agent && pnpm build
```
确保无 TypeScript 错误。

### 2. 部署到 Vercel (主应用)

**方式 A: Git 自动部署（推荐）**
```bash
git add -A && git commit -m "deploy: [描述]" && git push
```
Vercel 会自动检测推送并部署。

**方式 B: 手动部署**
```bash
npx vercel --prod
```

### 3. 部署到阿里云 FC (代理层)
```bash
s deploy -y --use-remote
```

> **重要说明**：
> - `--use-remote` 参数保留云端已配置的 HTTPS 证书
> - 如果不使用此参数，每次部署会将域名协议重置为 HTTP

### 4. 验证部署

**检查 Vercel**:
```bash
curl -s -o /dev/null -w "%{http_code}" https://ai-person-agent.vercel.app
```

**检查 FC 代理**:
```bash
curl -s -o /dev/null -w "%{http_code}" https://people.llmxy.xyz
```

**检查头像 (FC 静态资源)**:
```bash
curl -s -o /dev/null -w "%{http_code}" https://people.llmxy.xyz/avatars/04fda86b.jpg
```

## 何时需要部署

| 场景 | Vercel | FC |
|------|--------|-----|
| 修改页面/API 代码 | ✅ | ❌ |
| 修改头像文件 | ❌ | ✅ |
| 修改代理逻辑 | ❌ | ✅ |
| 修改数据库 schema | ✅ | ❌ |
| 修改 `.agent/workflows/` | ❌ | ❌ (本地文档) |

## 故障排查

### Vercel 部署失败
```bash
# 查看 Vercel 日志
npx vercel logs
```

### FC 部署失败
```bash
# 查看 FC 日志
s logs --tail 100
```

### 头像 404
检查 `proxy/public/avatars/` 是否包含该文件：
```bash
ls public/avatars/ | grep [filename]
```

## 快速部署（只更新代码）
```bash
# 一键部署到 Vercel + FC
git add -A && git commit -m "deploy" && git push && s deploy -y --use-remote
```
