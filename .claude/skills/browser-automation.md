---
name: browser
description: 浏览器自动化 - 使用 agent-browser CLI 进行网页交互、截图、数据抓取
allowed-tools:
  - Bash
---

使用 Vercel 的 agent-browser CLI 进行浏览器自动化。

## Headless vs Headed 模式

- **Headless（默认）**: 后台运行，不显示浏览器窗口
- **Headed**: 显示浏览器窗口，便于调试
  ```bash
  agent-browser open https://example.com --headed
  ```

## 核心工作流

### 1. 打开页面
```bash
agent-browser open <url>
agent-browser open <url> --headed  # 显示浏览器窗口
```

### 2. 获取元素（Snapshot + Ref）
```bash
agent-browser snapshot -i          # 只显示交互元素
agent-browser snapshot             # 完整可访问性树
agent-browser snapshot --json      # JSON 格式输出
```

输出示例：
```
- heading "Example" [ref=e1]
- textbox "Email" [ref=e2]
- button "Submit" [ref=e3]
```

### 3. 交互（使用 @ref）
```bash
agent-browser click @e3            # 点击按钮
agent-browser fill @e2 "test@x.com" # 填充输入框
agent-browser type @e2 "text"      # 逐字输入
agent-browser press Enter          # 按键
agent-browser hover @e1            # 悬停
agent-browser select @e4 "option"  # 下拉选择
agent-browser check @e5            # 勾选复选框
```

### 4. 等待
```bash
agent-browser wait 2000            # 等待 2 秒
agent-browser wait "#element"      # 等待元素出现
agent-browser wait --text "Done"   # 等待文本出现
agent-browser wait --load networkidle  # 等待网络空闲
```

### 5. 截图
```bash
agent-browser screenshot /tmp/page.png      # 视口截图
agent-browser screenshot /tmp/full.png -f   # 全页截图
```

### 6. 数据提取
```bash
agent-browser get text @e1         # 获取文本
agent-browser get html @e1         # 获取 HTML
agent-browser get value @e2        # 获取输入值
agent-browser get url              # 当前 URL
agent-browser get title            # 页面标题
```

### 7. 关闭
```bash
agent-browser close
```

## 多会话（并行任务）

```bash
agent-browser --session task1 open https://site1.com
agent-browser --session task2 open https://site2.com
agent-browser session list         # 列出所有会话
```

## 完整示例

### 示例 1: 搜索并提取结果
```bash
agent-browser open "https://hn.algolia.com/" --headed
agent-browser snapshot -i
# 找到 searchbox [ref=e3]

agent-browser fill @e3 "Claude AI"
agent-browser press Enter
agent-browser wait --load networkidle

agent-browser snapshot --json
agent-browser screenshot /tmp/results.png -f
agent-browser close
```

### 示例 2: 登录流程
```bash
agent-browser open "https://example.com/login" --headed
agent-browser snapshot -i
# 找到 textbox "Email" [ref=e1], textbox "Password" [ref=e2], button "Login" [ref=e3]

agent-browser fill @e1 "user@example.com"
agent-browser fill @e2 "password"
agent-browser click @e3

agent-browser wait --load networkidle
agent-browser get url  # 验证是否登录成功
agent-browser close
```

## 常见问题

| 问题 | 解决方案 |
|-----|---------|
| 元素找不到 | 重新运行 `snapshot -i` 获取最新 refs |
| 页面没加载完 | 添加 `wait --load networkidle` |
| 想看浏览器 | 添加 `--headed` 参数 |
| 并行任务冲突 | 使用 `--session <name>` 隔离 |

## 与 MCP Playwright 对比

| 特性 | agent-browser | mcp__playwright__ |
|-----|---------------|-------------------|
| 调用方式 | Bash CLI | MCP Tool |
| 元素选择 | @ref（更稳定） | CSS/描述 |
| 多会话 | 内置支持 | 手动管理 |
| 调试 | --headed | 无 |
| 推荐场景 | 多步骤流程 | 单次操作 |
