# P2 Batch Knowledge Thread Seeds

Date: 2026-06-18
Input: `docs/knowledge-threads/batch-thread-seeds.json`
Boundary: review package only; no production DB write, publishing, paid API call, X Search/Grok change, or UI work.

## Selected Topics

| Rank | Topic | Why now | Mimo handoff |
|---:|---|---|---|
| 1 | Agentic Coding | Closest to the Loop Engineering sample, so it is the lowest-risk replication test for the schema and review rules. | Ready for Mimo first. |
| 2 | Context Engineering | Tests a method-level thread where the boundary is wider than one product, but still sourceable through docs, papers, and implementation examples. | Ready for Mimo after Agentic Coding. |
| 3 | MCP | Strong protocol/ecosystem topic with official docs and SDKs; best used to validate protocol-style source packs. | Ready for Mimo after current official doc URLs and transcript availability are checked. |

I moved MCP behind Context Engineering because MCP is an infrastructure layer. Agentic Coding validates product/workflow replication first; Context Engineering validates the broader method layer; MCP then validates a protocol/ecosystem thread without forcing the protocol to carry the whole context-engineering story.

## Common Acceptance Rules

Each topic needs at least 15 topic-page sources, all five roles, and at least 6 cross-source edges:

- `signal`
- `official_definition`
- `transcript_context`
- `paper_foundation`
- `implementation_signal`

`earnings_transcript`, `sec_filing`, `investor_relations`, `annual_report`, and `shareholder_letter` do not count toward technical topic readiness. If useful, they can only live under `companyStrategyContextTargets` or a later company page `company_strategy_context` summary with `excludedFromTopicReadiness=true`.

## Topic Boundaries

### Agentic Coding

Definition boundary: AI-assisted software development where an agent can plan, edit, run tools, verify, and iterate across real repositories. Keep this broader than Loop Engineering. Loop Engineering is a workflow pattern inside agentic coding; Agentic Coding is the product and practice category.

First source strategy: start with Claude Code official docs and best-practices material, then add SWE-bench/SWE-agent/ReAct papers, GitHub Action or SDK implementation sources, and transcript context from named coding-agent builders.

Acceptance notes: Mimo should not treat vendor marketing as benchmark proof. Product claims need edges to real-repo benchmarks or implementation surfaces.

### Context Engineering

Definition boundary: deliberate design of instructions, memory, retrieval, tools, state, compression, and verification context for AI agents. Do not reduce it to prompt engineering or context-window size.

First source strategy: start with official prompt/context docs and agent-system guidance, then add Claude Code memory/runtime docs, RAG, long-context, and memory-management papers, plus implementation sources that show context as runtime state.

Acceptance notes: this topic is likely to become thin if Mimo only finds vocabulary posts. The page must explain how each paper supports context design, not just cite broad LLM-memory work.

### MCP

Definition boundary: Model Context Protocol as a standardized client-server integration layer for tools, data, prompts, and resources. Keep it separate from generic tool use and from any single client product.

First source strategy: start with official MCP docs, specification, SDKs, reference implementations, and Claude Code MCP docs. Add tool-use papers for technical foundation and transcripts only when actual transcript text is available.

Acceptance notes: if transcript context is missing, mark the pack thin. Community server lists are useful adoption signals but should not override official spec and SDK sources.

## Mimo Review Standard

For each topic, Mimo should return:

- `thread` with `slug`, `title`, `summary`, `whyNow`, `confidence`, and `status`
- `sources[]` with `url`, `title`, `sourceKind`, `role`, `evidenceQuote`, `summary`, and `relevanceScore`
- `edges[]` with `fromUrl` or source id, `toUrl` or source id, `relationType`, and `evidenceNote`
- `review` with `missingRoles`, `weakSources`, `duplicateGroups`, and `publishReadiness`

Any pack with missing roles, fewer than 15 readiness-counting sources, no transcript text, dangling edges, or readiness-counted financial/IR sources must be `thin`.
