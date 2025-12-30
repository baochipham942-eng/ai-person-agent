---
description: 部署到阿里云 FC 生产环境（保留 HTTPS 配置）
---

# 部署流程

## 前置条件
- 确保 `.env` 文件中包含所有必要的环境变量
- 确保已登录阿里云 Serverless Devs (`s config`)

## 部署步骤

// turbo-all

1. 构建并部署（保留云端域名配置）
```bash
cd /Users/linchen/Downloads/ai/ai-person-agent && s deploy -y --use-remote
```

> **重要说明**：
> - `--use-remote` 参数会保留云端已配置的 HTTPS 证书和协议设置
> - 如果不使用此参数，每次部署会将域名协议重置为 HTTP（因为 s.yaml 中只配置了 HTTP）
> - 首次部署后需要在阿里云控制台手动开启 HTTPS 并绑定证书

2. 验证部署
```bash
curl -I https://people.llmxy.xyz
```

## 故障排查

如果遇到问题，可以查看函数日志（需要先在 s.yaml 中配置 logConfig）：
```bash
s logs --tail 100
```
