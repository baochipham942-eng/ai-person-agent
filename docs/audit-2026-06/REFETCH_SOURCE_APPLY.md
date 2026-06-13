# Refetch Source Apply

Generated at: 2026-06-10T05:57:06.904Z
Mode: dry-run
Input: docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_exa_mimo.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 490 |
| eligible source rows | 417 |
| selected source rows | 417 |
| skipped source/decision rows | 110 |
| existing RawPoolItems | 417 |
| raw inserted | 0 |
| raw updated | 417 |
| keep audits inserted | 0 |
| keep audits already existed | 417 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 367 |
| augment_source | 50 |

## Source Types

| Source type | Count |
| --- | --- |
| exa | 268 |
| official | 84 |
| paper | 37 |
| youtube | 15 |
| github | 6 |
| podcast | 7 |

## Top Hosts

| Host | Count |
| --- | --- |
| arxiv.org | 17 |
| youtube.com | 15 |
| hub.baai.ac.cn | 14 |
| openreview.net | 8 |
| cloud.tencent.com | 6 |
| cnbc.com | 6 |
| m.36kr.com | 6 |
| podcasts.apple.com | 6 |
| time.com | 6 |
| aclanthology.org | 5 |
| finance.sina.com.cn | 5 |
| m.bjnews.com.cn | 5 |
| qbitai.com | 5 |
| technologyreview.com | 5 |
| ted.com | 5 |
| tsinghua.edu.cn | 5 |
| cs.stanford.edu | 4 |
| github.com | 4 |
| research.google | 4 |
| techcrunch.com | 4 |
| colah.github.io | 3 |
| cs.toronto.edu | 3 |
| hai.stanford.edu | 3 |
| mlanthology.org | 3 |
| news.sciencenet.cn | 3 |
| nlp.stanford.edu | 3 |
| podwise.ai | 3 |
| yoshuabengio.org | 3 |
| 21jingji.com | 2 |
| 80000hours.org | 2 |

## Sample Applied Rows

| Person | Decision | Type | Title | Host | Raw | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Aidan Gomez | replace_source | exa | Aidan Gomez \| Computer Science & Mathematics | aidangomez.ca | would_update_raw | keep_audit_exists |
| Aidan Gomez | replace_source | exa | Aidan Gomez: The 100 Most Influential People in AI 2023 | time.com | would_update_raw | keep_audit_exists |
| Aidan Gomez | replace_source | exa | Cohere CEO Aidan Gomez sees AI’s pathway to profitability \| The Verge | theverge.com | would_update_raw | keep_audit_exists |
| Aidan Gomez | replace_source | exa | Cohere CEO and ex-Google researcher Aidan Gomez on how AI makes money | cnbc.com | would_update_raw | keep_audit_exists |
| Aidan Gomez | replace_source | official | How We’re Getting AI Risk Wrong | cohere.com | would_update_raw | keep_audit_exists |
| Aidan Gomez | replace_source | paper | Attention Is All You Need | arxiv.org | would_update_raw | keep_audit_exists |
| Aidan Gomez | replace_source | youtube | Synthetic Data and the Future of AI \| Cohere CEO Aidan Gomez | youtube.com | would_update_raw | keep_audit_exists |
| Alexandr Wang | replace_source | exa | From MIT dropout to AI mogul: how the world’s youngest self-made tech billionai... | e.vnexpress.net | would_update_raw | keep_audit_exists |
| Andrej Karpathy | replace_source | exa | Andrej Karpathy | karpathy.ai | would_update_raw | keep_audit_exists |
| Andrej Karpathy | replace_source | github | karpathy/llm-council | github.com | would_update_raw | keep_audit_exists |
| Andrej Karpathy | replace_source | github | llm-wiki · GitHub | gist.github.com | would_update_raw | keep_audit_exists |
| Andrej Karpathy | replace_source | github | Minimal character-level language model with a Vanilla Recurrent Neural Network,... | gist.github.com | would_update_raw | keep_audit_exists |
| Andrej Karpathy | replace_source | official | Andrej Karpathy Academic Website | cs.stanford.edu | would_update_raw | keep_audit_exists |
| Andrej Karpathy | replace_source | youtube | [1hr Talk] Intro to Large Language Models | youtube.com | would_update_raw | keep_audit_exists |
| Andrej Karpathy | replace_source | youtube | Andrej Karpathy: Software Is Changing (Again) | youtube.com | would_update_raw | keep_audit_exists |
| Andrej Karpathy | replace_source | youtube | How I use LLMs | youtube.com | would_update_raw | keep_audit_exists |
| Andrej Karpathy | replace_source | youtube | Let's build GPT: from scratch, in code, spelled out. | youtube.com | would_update_raw | keep_audit_exists |
| Arthur Mensch | augment_source | exa | a16z Podcast - Jensen Huang and Arthur Mensch on Winning the Global AI Race Tra... | podscripts.co | would_update_raw | keep_audit_exists |
| Arthur Mensch | replace_source | exa | Apprentissage de représentations en imagerie fonctionnelle \| Theses.fr | theses.fr | would_update_raw | keep_audit_exists |
| Arthur Mensch | replace_source | exa | Arthur Mensch – Parietal | team.inria.fr | would_update_raw | keep_audit_exists |
| Arthur Mensch | replace_source | exa | Arthur Mensch \| MIT Technology Review | technologyreview.com | would_update_raw | keep_audit_exists |
| Arthur Mensch | replace_source | exa | France’s great AI hope sees opportunity in China’s chatbot success – POLITICO | politico.eu | would_update_raw | keep_audit_exists |
| Arthur Mensch | replace_source | exa | Jensen Huang, Anjney Midha and Arthur Mensch on Winning the Global AI Race \| An... | a16z.com | would_update_raw | keep_audit_exists |
| Arthur Mensch | replace_source | exa | Mistral CEO thinks the world will move beyond AI models this year | cnbc.com | would_update_raw | keep_audit_exists |
| Arthur Mensch | replace_source | exa | Mistral's CEO Arthur Mensch tells BI that DeepSeek is a win for the open-source... | africa.businessinsider.com | would_update_raw | keep_audit_exists |
| Arthur Mensch | augment_source | exa | Safety in Numbers: Keeping AI Open \| Andreessen Horowitz | a16z.com | would_update_raw | keep_audit_exists |
| Arthur Mensch | replace_source | github | Arthur Mensch (@arthurmensch) | github.com | would_update_raw | keep_audit_exists |
| Arthur Mensch | replace_source | paper | Arthur Mensch - Home | dl.acm.org | would_update_raw | keep_audit_exists |
| Chris Olah | replace_source | exa | About Me - colah's blog | colah.github.io | would_update_raw | keep_audit_exists |
| Chris Olah | replace_source | exa | Chris Olah on working at top AI labs without an undergrad degree \| 80,000 Hours | 80000hours.org | would_update_raw | keep_audit_exists |
| Chris Olah | replace_source | exa | Understanding LSTM Networks -- colah's blog | colah.github.io | would_update_raw | keep_audit_exists |
| Chris Olah | replace_source | exa | Visual Information Theory -- colah's blog | colah.github.io | would_update_raw | keep_audit_exists |
| Chris Olah | replace_source | official | Christopher Olah - Research at Google | research.google.com | would_update_raw | keep_audit_exists |
| Chris Olah | replace_source | official | Feature Visualization | research.google | would_update_raw | keep_audit_exists |
| Chris Olah | replace_source | paper | Feature Visualization \| ML Anthology | mlanthology.org | would_update_raw | keep_audit_exists |
| Christopher Manning | replace_source | official | Christopher Manning, Stanford NLP | nlp.stanford.edu | would_update_raw | keep_audit_exists |
| Christopher Manning | replace_source | official | Christopher Manning, Stanford NLP | nlp.stanford.edu | would_update_raw | keep_audit_exists |
| Christopher Manning | augment_source | official | Quantifying large language model usage in scientific papers | nlp.stanford.edu | would_update_raw | keep_audit_exists |
| Daniela Amodei | replace_source | exa | TIME100 AI 2023: Dario and Daniela Amodei | time.com | would_update_raw | keep_audit_exists |
| Dario Amodei | replace_source | exa | Dario Amodei | darioamodei.com | would_update_raw | keep_audit_exists |
| Dario Amodei | replace_source | exa | Dario Amodei — The Urgency of Interpretability | darioamodei.com | would_update_raw | keep_audit_exists |
| Dario Amodei | replace_source | paper | [2211.03540] Measuring Progress on Scalable Oversight for Large Language Models | arxiv.org | would_update_raw | keep_audit_exists |
| Demis Hassabis | replace_source | exa | Demis Hassabis Embraces the Future of Work in the Age of AI \| WIRED | wired.com | would_update_raw | keep_audit_exists |
| Demis Hassabis | replace_source | exa | Demis Hassabis Is on the 2025 TIME100 List | time.com | would_update_raw | keep_audit_exists |
| Demis Hassabis | replace_source | exa | Demis Hassabis Is Preparing for AI’s Endgame | time.com | would_update_raw | keep_audit_exists |
| Demis Hassabis | replace_source | exa | Sir Demis Hassabis \| Academy of Achievement | achievement.org | would_update_raw | keep_audit_exists |
| Demis Hassabis | replace_source | exa | Sir Demis Hassabis, PhD - Isomorphic Labs | isomorphiclabs.com | would_update_raw | keep_audit_exists |
| Demis Hassabis | replace_source | official | Demis Hassabis \| The Center for Brains, Minds & Machines | cbmm.mit.edu | would_update_raw | keep_audit_exists |
| Dylan Field | augment_source | exa | Episode 29: Dylan Field, Figma Co-founder, Talks Design, Digital Economy, and R... | distributed.blog | would_update_raw | keep_audit_exists |
| Elon Musk | replace_source | exa | A Letter to Our Shareholders on the 2025 CEO Interim Award | digitalassets.tesla.com | would_update_raw | keep_audit_exists |

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
