# Changelog

## 0.2.0 - 2026-06-13

### 新功能

- 新增 AI 人物情报工作台路径：动态流、话题页、机构页、全局关系图、关注列表、周报页和人物对比报告。
- 新增关注、Newsletter、ActivityEvent、CompareReport、影响力校准和质量复核相关 API、后台页面与数据模型。
- 新增生产上线门禁、迁移计划、readiness、响应式 smoke、质量复核、实体密度、关系图谱和 YouTube 字幕批处理脚本。
- 补齐目录浏览、人物详情、关系展示、近期动态、影响力拆解和代表内容的产品化入口。

### 修复

- 修复对比按钮本地状态读取造成的 hydration/lint 风险。
- 过滤公共头像出口到本地头像，减少远程图片依赖和生产图片错误。
- 清理并忽略生成类 audit/export 产物，避免仓库 footprint 继续放大。

### 文档

- 补充产品增长计划、执行板、Newsletter 配置、质量复核和上线门禁手册。
- 同步关键数据库模型说明，覆盖新增 ActivityEvent、NewsletterDeliveryLog、CompareReport 和 InfluenceScoreAuditLog。
