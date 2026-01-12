---
name: browser-automation
description: 浏览器自动化 - 截图、交互、抓取动态页面
allowed-tools:
  - mcp__playwright__browser_navigate
  - mcp__playwright__browser_snapshot
  - mcp__playwright__browser_click
  - mcp__playwright__browser_type
  - mcp__playwright__browser_take_screenshot
  - mcp__playwright__browser_evaluate
  - mcp__playwright__browser_wait_for
---

使用 Playwright MCP 进行浏览器自动化操作。

## 工作流程

1. **导航到页面**
   ```
   mcp__playwright__browser_navigate(url="https://example.com")
   ```

2. **获取页面快照** (推荐，比截图更有用)
   ```
   mcp__playwright__browser_snapshot()
   ```

3. **点击元素**
   ```
   mcp__playwright__browser_click(element="Submit button", ref="button[0]")
   ```

4. **输入文本**
   ```
   mcp__playwright__browser_type(element="Search box", ref="input[0]", text="query")
   ```

5. **截图**
   ```
   mcp__playwright__browser_take_screenshot(name="screenshot")
   ```

## 适用场景

- 需要 JavaScript 渲染的页面
- 需要登录后才能访问的内容
- 需要交互操作的页面
- 页面截图存档
