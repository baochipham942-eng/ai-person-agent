# 错题本 (GLOBAL_LESSONS)

## 2026-01-03
- **错误**: 未使用中文编写文档/计划。
- **原因**: 忽略了项目宪法中的语言偏好设置。
- **纠正**: 已将 Implementation Plan 翻译为中文，并承诺后续交互和文档默认使用中文。

- **错误**: 生产环境 API 报错 `cached plan must not change result type`。
- **原因**: 使用了 Neon/Pgbouncer 连接池。当 Schema 发生列类型变更（Int -> Float）时，缓存的 Prepared Statements 类型不匹配导致报错。
- **纠正**: 使用 `prisma.$queryRaw` (原生 SQL) 绕过 Prisma 的 Prepared Statements 缓存。长期建议在破坏性 Schema 变更后强制重启应用实例。
