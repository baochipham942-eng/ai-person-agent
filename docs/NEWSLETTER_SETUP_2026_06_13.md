# Newsletter Setup Playbook

> 日期: 2026-06-13  
> 范围: Resend 生产配置、只读预检、可记录 dry-run、小流量真实发送前确认。  
> 边界: 不把真实 secret 写进仓库；不运行 `--send`；不启动 dev server。

## 当前状态

Newsletter 代码链路已经具备。本机 `.env.local` 已按爸给的值写入 provider、Resend key、sender、reply-to、生产站点 URL 和 token secret；发送总开关仍保持关闭，真实邮件没有发送。

生产库的 `NewsletterDeliveryLog` 和 provider 字段已经是 readiness 依赖项。脚本模式要分清：

| 操作 | 命令形态 | 只读 | 写 `NewsletterDeliveryLog` | 真实发邮件 |
|---|---|---:|---:|---:|
| readiness | `npm run ops:readiness` | 是 | 否 | 否 |
| newsletter preflight | `npm run newsletter:weekly -- --preflight ...` | 是 | 否 | 否 |
| newsletter dry run | `npm run newsletter:weekly -- --limit=5 --event-limit=8` | 是 | 否 | 否 |
| 记录草稿 | `npm run newsletter:weekly -- --record ...` | 否 | 是，`status=dry_run` | 否 |
| rollout 记录草稿 | `npm run ops:production-rollout -- --confirm-production --record-newsletter ...` | 否 | 是，`status=dry_run` | 否 |
| 发送预检 | `npm run newsletter:weekly -- --preflight --send --confirm-newsletter-send ...` | 是 | 否 | 否 |
| 真实发送 | `npm run newsletter:weekly -- --send --confirm-newsletter-send ...` | 否 | 是，`sent/failed` | 是 |
| rollout 真实发送 | `npm run ops:production-rollout -- --confirm-production --send-newsletter --confirm-newsletter-send ...` | 否 | 是，`sent/failed` | 是 |

## 爸在 Resend 控制台要做的事

1. 进入 Resend 控制台，创建或选择项目。
2. 添加发送域名，例如 `people.example.com` 或 `mail.example.com`。
3. 按 Resend 给出的 DNS 记录配置域名验证，通常包括 SPF、DKIM、Return-Path / bounce 相关记录。
4. 等 Resend 控制台显示域名 verified。
5. 创建 production API key，只给发送邮件所需权限。
6. 确定发件人展示名和地址，例如 `AI People <digest@mail.example.com>`。
7. 可选：确定 reply-to 地址，例如 `hello@example.com`。
8. 在 Resend 里打开日志页，后面小流量试发时用它对照 `NewsletterDeliveryLog.providerMessageId`。

## 当前本机配置

这些值只放到部署环境或本机 `.env.local`，不写进文档、不提交仓库。当前本机只记录是否已配置，不记录 secret 明文。

| 变量 | 示例 | 用途 | 当前状态 |
|---|---|---|---|
| `PRODUCTION_BASE_URL` | `https://people.llmxy.xyz` | 退订链接和生产 launch gate 基准 URL | 本机已写入 |
| `NEWSLETTER_EMAIL_PROVIDER` | `resend` | 指定发送 provider | 本机已写入 |
| `NEWSLETTER_SEND_ENABLED` | `true` | 最终发信总开关 | 本机保持 `false` |
| `RESEND_API_KEY` | `re_...` | 调 Resend API | 本机已写入，文档不记录明文 |
| `NEWSLETTER_FROM_EMAIL` | `AI 人物库 <newsletter@llmxy.xyz>` | 发件人 | 本机已写入 |
| `NEWSLETTER_REPLY_TO` | `newsletter@llmxy.xyz` | 回复地址，可选 | 本机已写入 |
| `NEWSLETTER_TOKEN_SECRET` | 长随机字符串 | 退订 token 签名；可独立于登录 secret | 本机已存在 |

本地只读 preflight 最少需要 `DATABASE_URL`、站点 URL、token secret 或 `AUTH_SECRET/NEXTAUTH_SECRET`。真实发送还必须满足 provider、send enabled、Resend key、from email。

2026-06-13 本机验证:

1. `scripts/newsletter/build_weekly_digest_email.mjs` 已加载 `.env` 和 `.env.local`。
2. `node --check scripts/newsletter/build_weekly_digest_email.mjs` 通过。
3. `npm run newsletter:weekly -- --preflight --limit=5 --event-limit=8` 通过。
4. `npm run newsletter:weekly -- --limit=5 --event-limit=8` 通过，结果为 `subscriptions=0`、`generated=0`，没有写 delivery log，没有发送邮件。
5. Resend API 只读查询确认 `llmxy.xyz` 状态为 `verified`。
6. 临时传 `NEWSLETTER_SEND_ENABLED=true` 跑 `npm run newsletter:weekly -- --preflight --send --confirm-newsletter-send --limit=5 --event-limit=8` 通过；因为带 `--preflight`，仍没有发邮件、没有写 delivery log。
7. 经爸授权，生产库写入测试订阅 `317054513@qq.com`，frequency 为 `weekly`。
8. 经爸授权，临时传 `NEWSLETTER_SEND_ENABLED=true` 跑真实小流量发送，生成 1 封、发送 1 封、失败 0 封，provider 为 Resend。
9. 回读 `NewsletterDeliveryLog`，最新记录 `status=sent`、`provider=resend`、`attempts=1`，provider message id 已存在。
10. 回读 `npm run ops:readiness`，`newsletter.sent=1`、`newsletter-send-observation=ready`；本机默认 `NEWSLETTER_SEND_ENABLED=false`，所以整体状态仍会提示发送开关未打开。
11. Vercel CLI 重新登录后，production env 已写入 `PRODUCTION_BASE_URL`、`NEWSLETTER_EMAIL_PROVIDER`、`NEWSLETTER_SEND_ENABLED=false`、`RESEND_API_KEY`、`NEWSLETTER_FROM_EMAIL`、`NEWSLETTER_REPLY_TO` 和 `NEWSLETTER_TOKEN_SECRET`。
12. 2026-06-13 已对现有 Vercel production deployment 执行安全 redeploy，新 deployment 为 `ai-person-agent-f4dk8c1x2-leolins-projects-0fe43c0f.vercel.app`，production alias 已切换。
13. 线上 smoke check: `https://people.llmxy.xyz/` 返回 200，`/api/person/directory?limit=3` 返回 `total=252`。

## 我能执行的本地命令

这些命令不发邮件、不写 `NewsletterDeliveryLog`：

```bash
npm run ops:readiness
```

```bash
npm run newsletter:weekly -- --preflight --limit=5 --event-limit=8
```

```bash
npm run newsletter:weekly -- --limit=5 --event-limit=8
```

如果当前 shell 没有生产 URL，但爸只是想验证本地只读链路，可以临时传 URL，不改 `.env`：

```bash
PRODUCTION_BASE_URL=https://people.example.com \
npm run newsletter:weekly -- --preflight --limit=5 --event-limit=8
```

## Preflight 命令

真实发送前先跑只读 preflight。这个命令带了 `--send`，但同时带 `--preflight`，脚本只检查条件，不会加载订阅发送邮件，也不会写 log：

```bash
npm run newsletter:weekly -- \
  --preflight \
  --send \
  --confirm-newsletter-send \
  --limit=5 \
  --event-limit=8
```

通过条件：

1. `NewsletterDeliveryLog` 表和 provider columns ready。
2. `PRODUCTION_BASE_URL`、`NEXT_PUBLIC_SITE_URL` 或 `SITE_URL` 至少一个存在。
3. `NEWSLETTER_TOKEN_SECRET`、`AUTH_SECRET` 或 `NEXTAUTH_SECRET` 至少一个存在。
4. `NEWSLETTER_EMAIL_PROVIDER=resend`。
5. `NEWSLETTER_SEND_ENABLED=true`。
6. `RESEND_API_KEY` 存在。
7. `NEWSLETTER_FROM_EMAIL` 存在，且域名在 Resend verified。
8. `limit<=5`，`event-limit<=8`。

## 可选的写入前演练

这一步会写 `NewsletterDeliveryLog`，但不会发邮件。它适合在真实发送前留一条草稿证据：

```bash
npm run ops:production-rollout -- \
  --confirm-production \
  --record-newsletter \
  --newsletter-limit=5 \
  --newsletter-event-limit=8 \
  --evidence-only-launch-gate
```

写入结果应为 `status=dry_run`、`provider=dry_run`。如果只是想看邮件样本，不要跑这条，跑普通 dry run 就够。

## 真实发送前确认句

真实发送只能在爸明确给出这句之后执行：

```text
确认用 Resend 真实发送 Newsletter 小流量批次，limit=5，event-limit=8，允许写 NewsletterDeliveryLog，并允许发送真实邮件。
```

收到确认后才允许跑：

```bash
npm run ops:production-rollout -- \
  --confirm-production \
  --send-newsletter \
  --confirm-newsletter-send \
  --newsletter-limit=5 \
  --newsletter-event-limit=8 \
  --require-launch-gate \
  --evidence-only-launch-gate
```

发送后只读回读：

```bash
npm run ops:readiness
```

验收看三处：

1. `readiness.newsletter.sent > 0` 或 failed 有明确错误。
2. `NewsletterDeliveryLog.providerMessageId` 能和 Resend 日志对上。
3. 收件人收到邮件，退订链接指向生产域名，并能返回明确结果。

## 回滚和关闭开关

最快关闭：

```bash
NEWSLETTER_SEND_ENABLED=false
```

保守关闭：

```bash
NEWSLETTER_EMAIL_PROVIDER=""
NEWSLETTER_SEND_ENABLED=false
RESEND_API_KEY=""
```

Resend 控制台侧也可以立刻 revoke API key。已经写入的 `NewsletterDeliveryLog` 不建议删除，保留发送审计；如果发生误发，后续处理应该新增更正记录或运营说明，不直接抹日志。

## 并行 checklist

| Lane | 负责人 | 动作 | 是否阻塞发送 |
|---|---|---|---|
| Resend domain | 爸 | 配 DNS 并等 verified | 是 |
| Sender | 爸 | 确认 `NEWSLETTER_FROM_EMAIL` 和 reply-to | 是 |
| Secret | 爸 | 给部署环境填 `RESEND_API_KEY`、`NEWSLETTER_TOKEN_SECRET` | 是 |
| URL | 爸 | 给部署环境填 `PRODUCTION_BASE_URL` | 是 |
| Local preflight | 我 | 跑只读 preflight，不带真实 `--send` 执行动作 | 否 |
| Draft evidence | 我，需确认 | 跑 `--record` 写 dry_run log | 否，但会写库 |
| Real send | 我，需确认 | 跑小流量真实发送 | 是 |

## 当前缺口

1. `NEWSLETTER_SEND_ENABLED` 仍保持 `false`，直到下一次真实发送窗口再临时打开。
2. 下一批真实发送前需要再次确认收件范围，避免把测试订阅误扩成全量发送。
3. Vercel env 已同步，但现有 production deployment 不会自动重启；下一次安全发布时让它带着新 env 一起生效。
