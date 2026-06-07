# Scripts

本目录按用途分层管理脚本，避免根目录继续堆积一次性修复和临时排查脚本。

## 常用入口

- `scripts/enrich/rewash_existing.ts`: 基于 RawPoolItem 重跑语义审计，写入 QAAuditLog；默认不 prune。
- `scripts/enrich/trigger_content_fetch.ts`: 触发内容抓取。
- `scripts/enrich/recrawl_robust.ts`: 更稳健的重抓入口。
- `scripts/audit/audit_data_quality.ts`: 数据质量审计入口。
- `scripts/fix/apply_audit_fixes.ts`: 按审计结果执行修复；运行前确认 dry-run / execute 边界。
- `scripts/tools/export_people_csv.ts`: 导出人物 CSV。
- `scripts/test_courses.ts`: 课程抓取能力测试。
- `scripts/test_courses_free.ts`: 课程测试的免费源验证脚本。

## 目录归属

- `enrich/`: 抓取、补全、重洗、聚合类脚本。
- `audit/`: 只读审计、统计、冲突检测类脚本。
- `fix/`: 数据修复脚本，默认应支持 dry-run 或显式执行参数。
- `tools/`: 导入导出、转换、辅助工具。
- `cron/`: 可长期运行或定时调度的脚本。
- `archive/`: 不再作为常用入口的一次性历史脚本。

## 归档规则

1. 只移动 git 已跟踪的根目录一次性脚本；未跟踪脚本先确认来源和归属。
2. 破坏性脚本必须默认 dry-run，或要求 `--execute` / 明确确认后才写库。
3. 常用入口保留在规范目录，不放回 `scripts/` 根目录。
4. 搬迁脚本后同步更新 package scripts、文档引用和运行说明。

## 当前治理状态

2026-06-07 已将 33 个无直接引用的 git tracked 根目录脚本移入 `scripts/archive/`。根目录当前保留 2 个 `.ts`：

- tracked: `test_courses.ts`、`test_courses_free.ts`
- 已归档 untracked 修复脚本: `fix_data_quality_issues.ts`、`fix_dingjie.ts`、`fix_empty_organization.ts`

规范目录已包含 `audit/`、`enrich/`、`fix/`、`tools/` 等长期入口；根目录只保留明确仍在 README 中出现的课程测试入口。
