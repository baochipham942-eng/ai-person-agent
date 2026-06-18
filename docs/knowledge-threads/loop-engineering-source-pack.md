# Loop Engineering Source Pack

Date: 2026-06-18
Thread: `/threads/loop-engineering`
Owner: S1 source pack

## Use Boundary

This pack is for evidence gathering only. It does not change schema, seed data, routes, or production data.

This version follows the corrected S1 boundary: financial filings, earnings calls, SEC filings, and IR materials are not first-class sources for the Loop Engineering topic page. If they appear, they belong in the `company_strategy_context candidates` appendix for company or institution aggregation pages, and they do not count toward topic-page readiness.

`Loop Engineering` should be treated as a curated working concept for the product page: a developer workflow around repeated agent planning, tool use, code execution, verification, and feedback inside coding-agent environments such as Claude Code. The strongest backing comes from Claude Code official material, transcript context, engineering implementation surfaces, and agent/tool-use papers. Boris Cherny's X signal is useful for freshness and vocabulary, but it should stay in `signal`, not in `official_definition`.

## Coverage

| Role | Count | Status | Notes |
|---|---:|---|---|
| `signal` | 2 | usable | Boris X signal is fragile because X access can vary; Addy Osmani is a practitioner vocabulary signal. |
| `official_definition` | 5 | strong | Claude Code docs, launch post, workflow docs, and engineering best practices support the loop shape. |
| `transcript_context` | 2 | usable | Podcast/video sources have transcript surfaces, but final page should quote only retrieved transcript text. |
| `paper_foundation` | 5 | strong | ReAct, Toolformer, SWE-bench, SWE-agent, and agent-cost work cover tools, evaluation, and loop constraints. |
| `implementation_signal` | 8 | strong | SDK, hooks, subagents, MCP, skills, GitHub Action, and examples show the engineering realization path. |

Topic-page candidates: 22
Company strategy appendix candidates: 6

## Recommended Evidence Stack

1. Define the concept from official Claude Code materials: terminal agent, tool use, workflows, SDK, hooks, MCP, and verification.
2. Use Boris Cherny and practitioner posts only to show why the vocabulary is emerging now.
3. Ground the mechanics in papers: ReAct for reasoning/actions, Toolformer for tool calls, SWE-bench/SWE-agent for real software tasks, and agent-cost papers for long-running loop constraints.
4. Use implementation sources to show how the loop becomes repeatable engineering practice: hooks, subagents, skills, SDK sessions, MCP tools, GitHub workflows, and examples.

## Best Topic Candidates

| id | role | sourceKind | confidence | title |
|---|---|---|---:|---|
| `sig_bcherny_x_workflow_2026_01` | `signal` | `x_post` | 0.72 | Boris Cherny X post on Claude Code workflow |
| `sig_osmani_loop_engineering` | `signal` | `practitioner_blog` | 0.70 | The Rise of Loop Engineering |
| `off_anthropic_claude_code_research_preview` | `official_definition` | `official_blog` | 0.95 | Claude 3.7 Sonnet and Claude Code |
| `off_claude_code_overview` | `official_definition` | `official_docs` | 0.94 | Claude Code overview |
| `off_claude_code_how_it_works` | `official_definition` | `official_docs` | 0.92 | How Claude Code works |
| `off_claude_code_common_workflows` | `official_definition` | `official_docs` | 0.90 | Common workflows |
| `off_claude_code_best_practices` | `official_definition` | `official_engineering_blog` | 0.94 | Claude Code: Best practices for agentic coding |
| `tx_pragmatic_engineer_bcherny` | `transcript_context` | `podcast_transcript` | 0.78 | Building Claude Code with Boris Cherny |
| `tx_lenny_bcherny` | `transcript_context` | `podcast_transcript` | 0.72 | What happens after coding is solved? |
| `paper_react` | `paper_foundation` | `paper` | 0.93 | ReAct: Synergizing Reasoning and Acting in Language Models |
| `paper_toolformer` | `paper_foundation` | `paper` | 0.90 | Toolformer: Language Models Can Teach Themselves to Use Tools |
| `paper_swe_bench` | `paper_foundation` | `paper` | 0.94 | SWE-bench: Can Language Models Resolve Real-World GitHub Issues? |
| `paper_swe_agent` | `paper_foundation` | `paper` | 0.90 | SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering |
| `paper_agent_spend` | `paper_foundation` | `paper` | 0.70 | How Do AI Agents Spend Your Money? |
| `impl_claude_code_sdk` | `implementation_signal` | `official_docs` | 0.90 | Agent SDK overview |
| `impl_claude_code_hooks_reference` | `implementation_signal` | `official_docs` | 0.88 | Hooks reference |
| `impl_claude_code_hooks_guide` | `implementation_signal` | `official_docs` | 0.86 | Automate actions with hooks |
| `impl_claude_code_subagents` | `implementation_signal` | `official_docs` | 0.84 | Create custom subagents |
| `impl_claude_code_skills` | `implementation_signal` | `official_docs` | 0.82 | Extend Claude with skills |
| `impl_claude_code_mcp` | `implementation_signal` | `official_docs` | 0.84 | Connect Claude Code to tools via MCP |
| `impl_claude_code_action` | `implementation_signal` | `github_repo` | 0.86 | anthropics/claude-code-action |
| `impl_claude_code_action_example` | `implementation_signal` | `github_example` | 0.82 | claude-code-action example workflow |

## Cross-Source Edges

| from | to | relationType | evidenceNote |
|---|---|---|---|
| `sig_bcherny_x_workflow_2026_01` | `off_claude_code_common_workflows` | `tweet_keyword_to_official_workflow` | Boris frames Claude Code value as custom workflow; docs formalize repeatable workflows. |
| `off_claude_code_best_practices` | `paper_react` | `agent_loop_to_reason_action_foundation` | Best-practice loop of plan, edit, test, iterate maps to reasoning/action cycles. |
| `off_claude_code_how_it_works` | `paper_toolformer` | `tool_use_to_tool_call_foundation` | Claude Code's tool permissions and actions sit on the broader tool-use literature. |
| `off_claude_code_best_practices` | `paper_swe_bench` | `coding_loop_to_eval_benchmark` | Coding agents need real repo tasks and verification, not only toy coding prompts. |
| `impl_claude_code_sdk` | `impl_claude_code_mcp` | `agent_runtime_to_tool_integration` | SDK sessions become more useful when connected to tools and APIs. |
| `impl_claude_code_hooks_reference` | `impl_claude_code_hooks_guide` | `reference_to_workflow_example` | Hook schemas and examples show deterministic checkpoints around agent loops. |
| `impl_claude_code_subagents` | `off_claude_code_common_workflows` | `workflow_decomposition` | Subagents support delegated exploration and task-specific workflow loops. |
| `impl_claude_code_action_example` | `impl_claude_code_action` | `example_to_implementation` | The GitHub workflow turns coding-agent loops into PR and issue automation. |

## Company Strategy Context Candidates

These sources are preserved for company or institution pages only. They do not count toward Loop Engineering topic-page readiness.

| id | company | sourceKind | title |
|---|---|---|---|
| `ctx_amazon_q_developer` | Amazon | `official_company_blog` | Amazon Q Developer code transformation savings |
| `ctx_amazon_shareholder_letter_2024` | Amazon | `shareholder_letter` | 2024 Amazon Letter to Shareholders |
| `ctx_microsoft_fy26_q1` | Microsoft | `earnings_transcript` | Microsoft FY26 Q1 earnings call |
| `ctx_alphabet_q3_2024` | Alphabet / Google | `earnings_transcript` | Alphabet Q3 2024 earnings call |
| `ctx_alphabet_q1_2026` | Alphabet / Google | `earnings_transcript` | Alphabet Q1 2026 earnings call |
| `ctx_nvidia_q1_fy27` | NVIDIA | `ir_release` | NVIDIA Q1 FY2027 financial results |

## Thin Spots

1. The exact phrase `Loop Engineering` is not yet an official Anthropic product term. Treat it as a page concept and practitioner vocabulary.
2. X is unstable as a citation surface. Keep the Boris post in JSON, but the rendered page should have a fallback explanation if the post cannot be fetched.
3. Transcript sources need final transcript capture before publishing. They are usable for context now, but page quotes should come only from retrieved transcript text.
4. Company strategy materials should be routed to organization pages; topic pages should stay focused on product definition, implementation, transcript context, and technical foundations.

## Mimo Handoff

Use `docs/knowledge-threads/loop-engineering-sources.candidates.json` as the machine-readable input. Mimo should:

1. Deduplicate official docs that overlap on workflow mechanics.
2. Confirm transcript text before extracting page-ready quotes.
3. Keep `signal` sources visually separate from official, paper, and implementation sources.
4. Keep `companyStrategyContextCandidates` out of topic-page readiness scoring.
5. Reject any new topic candidate without `sourceKind`, `role`, `url`, `title`, `publishedAt`, `whyRelevant`, `confidence`, and `evidenceQuote`.
