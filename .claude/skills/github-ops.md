---
name: github-ops
description: GitHub 操作 - 查看 PR、Issue、仓库信息
allowed-tools:
  - mcp__github__get_pull_request
  - mcp__github__list_pull_requests
  - mcp__github__get_pull_request_files
  - mcp__github__get_pull_request_comments
  - mcp__github__get_issue
  - mcp__github__list_issues
  - mcp__github__search_code
  - mcp__github__search_repositories
  - mcp__github__get_file_contents
  - mcp__github__list_commits
---

使用 GitHub MCP 进行仓库操作。

## 常用操作

### 查看 PR
```
mcp__github__get_pull_request(owner, repo, pull_number)
mcp__github__get_pull_request_files(owner, repo, pull_number)
```

### 查看 Issue
```
mcp__github__get_issue(owner, repo, issue_number)
mcp__github__list_issues(owner, repo, state="open")
```

### 搜索代码
```
mcp__github__search_code(q="keyword repo:owner/repo")
```

### 当前项目
- Owner: `baochipham942-eng`
- Repo: `ai-person-agent`
