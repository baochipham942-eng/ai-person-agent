/**
 * Curate the first prune-tail Tavily+MiMo refetch batch before apply.
 *
 * This keeps the original MiMo output immutable and writes a reviewed JSONL
 * that removes sources rejected by manual source-quality review.
 */
import fs from 'node:fs';
import path from 'node:path';

const INPUT = getArg('--in') || 'docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo.jsonl';
const OUT = getArg('--out') || 'docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_curated.jsonl';
const SUMMARY_OUT = getArg('--summary-out') || OUT.replace(/\.jsonl$/i, '_summary.json');
const REPORT_OUT = getArg('--report-out') || 'docs/audit-2026-06/PRUNE_TAIL_REFETCH_TAVILY_MIMO_CURATED.md';

const REJECTED_HOSTS = {
  'karpathy.ai': 'raw_content_contains_obvious_page_pollution',
  'lerandom.art': 'secondary_editorial_with_overclaimed_wording',
  'artificial-intelligence.blog': 'low_authority_aggregated_profile',
  'x.com': 'social_or_login_limited_profile',
  'digg.com': 'low_authority_social_profile_aggregator',
  'linkedin.com': 'social_or_login_limited_profile',
  'podcasts.happyscribe.com': 'transcript_aggregator_not_primary_source',
  'podcasts.musixmatch.com': 'transcript_aggregator_not_primary_source',
  'podwise.ai': 'transcript_or_podcast_aggregator_not_primary_source',
  'y2doc.com': 'transcript_aggregator_not_primary_source',
  'singjupost.com': 'transcript_aggregator_not_primary_source',
  'allamericanspeakers.com': 'low_authority_speaker_bureau_profile',
  'inabr.com': 'low_authority_secondary_article_needs_primary_confirmation',
  'en.wikipedia.org': 'secondary_or_ugc_reference_source',
  'zh.wikipedia.org': 'secondary_or_ugc_reference_source',
  'scholar.google.com': 'search_or_profile_page_not_source_backed_claim',
  'substack.com': 'newsletter_or_blog_not_primary_source',
  'deepai.org': 'low_authority_aggregated_profile',
  'gspeakers.com': 'low_authority_speaker_bureau_profile',
  'speakersassociates.com': 'low_authority_speaker_bureau_profile',
  'chatgptiseatingtheworld.com': 'low_authority_commentary_not_primary_source',
  'ignorance.ai': 'low_authority_commentary_not_primary_source',
  'lifearchitect.ai': 'secondary_profile_or_transcript_aggregator_not_primary_source',
  'ifeng.com': 'secondary_news_or_repost_not_primary_source',
  'idctoutiao.com': 'low_authority_secondary_article_needs_primary_confirmation',
  'news.sina.cn': 'secondary_news_or_repost_not_primary_source',
  'wiki.mbalib.com': 'secondary_or_ugc_reference_source',
  'chessprogramming.org': 'secondary_or_ugc_reference_source',
};

const REJECTED_URLS = {
  'https://github.com/arthurmensch': 'profile_page_does_not_prove_target_project',
  'https://hanxiao.io/about': 'profile_page_does_not_prove_target_project',
  'https://developer.nvidia.com/blog/author/bcatanzaro': 'profile_page_does_not_prove_target_project',
  'https://openreview.net/profile?id=~Bryan_Catanzaro1': 'profile_page_does_not_prove_target_project',
  'https://m.36kr.com/p/1721999294465': 'background_interview_does_not_prove_target_project',
  'http://www.news.cn/liangzi/20251121/4783d310d50144af99d02f58b4050e5a/c.html': 'news_article_does_not_prove_target_project',
};

const REJECTED_CLAIM_URLS = {
  'prune-tail:cmjtxqpyn04bqrmtbkskudnf1': {
    'https://ml-summit.org/speaker/626?uid=c1014&lang=en': 'profile_page_does_not_prove_github_handle',
  },
  'prune-tail:cmjtxls3s035vrmtb5jsssc72': {
    'https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf': 'paper_does_not_prove_guest_instructor_claim',
  },
  'prune-tail:cmjtxs53b04mermtbfcpwk9qq': {
    'https://epublications.marquette.edu/zuckerberg_files_transcripts/2233': 'source_mentions_muse_not_target_mango',
  },
  'prune-tail:cmjtxmg9p03bwrmtbe515a3n7': {
    'https://www.semanticscholar.org/paper/In-context-Learning-and-Induction-Heads-Olsson-Elhage/c90a99eeb57019732a6cc996bb9eaf13faedf00f': 'secondary_index_prefer_primary_publication',
  },
  'prune-tail:cmjuuf5380fxcrmtbmgetxnbo': {
    'https://space50.caltech.edu/program/speakers/MuskE.html': 'background_profile_does_not_prove_target_ai_story',
  },
  'prune-tail:cmju0iziv074zrmtbvhr6qq8k': {
    'https://www.nature.com/articles/nature14539': 'background_paper_does_not_name_target_person',
  },
  'prune-tail:cmjtvvj5t018lrmtbok2qylun': {
    'https://hwchung2.github.io': 'profile_page_does_not_prove_target_news_claim',
  },
  'prune-tail:cmju1hiap0d9hrmtbffp301xg': {
    'https://time.com/collections/time100-ai/6310599/noam-shazeer': 'background_profile_does_not_prove_return_to_google_claim',
  },
  'prune-tail:cmjse8b4l000jco6y8s55xc1z': {
    'https://www.forbes.com/profile/sam-altman': 'background_profile_does_not_prove_target_story',
  },
  'prune-tail:cmjtvmniz009drmtbhruiynit': {
    'https://ai.meta.com/people/396469589677838/yann-lecun': 'profile_page_does_not_prove_target_podcast',
  },
  'prune-tail:cmjtxpbmt03yzrmtbqcpxjxvi': {
    'https://www.microsoft.com/en-us/research/people/horvitz': 'profile_page_does_not_prove_target_pcast_role',
  },
  'prune-tail:cmjtxlw59036jrmtbs3ntm77o': {
    'https://fellowsfund.substack.com/p/fellows-fund-welcomes-lilian-weng': 'substack_announcement_needs_primary_confirmation',
  },
  'prune-tail:cmjtxq8nq045urmtbmnfbawu0': {
    'https://montgomerysummit.com/speakers/ashish-vaswani': 'profile_page_does_not_prove_target_video_claim',
  },
  'prune-tail:cmjw75nqp0065ykszy2c96ubh': {
    'https://github.com/hanxiao': 'profile_page_does_not_prove_target_repository',
  },
  'prune-tail:cmju1ivb20dj8rmtbzquiy55u': {
    'https://www.cnbc.com/video/2026/02/18/watch-cnbcs-full-interview-with-mistral-ai-ceo-arthur-mensch.html': 'background_interview_does_not_prove_target_product_claim',
    'https://www.artefact.com/blog/adopt-ai-summit-bringing-open-ai-models-to-the-frontier-with-mistral-ai': 'background_event_page_does_not_prove_target_product_claim',
  },
  'prune-tail:cmju0ucm108okrmtbuuvvwxlm': {
    'https://time.com/collections/time100-ai-2024/7012873/chris-olah': 'background_profile_does_not_prove_target_video_claim',
    'https://colah.github.io/about.html': 'profile_page_does_not_prove_target_video_claim',
  },
  'prune-tail:cmjtvob7p00kfrmtb12irwcx6': {
    'https://time.com/collections/time100-ai/6310659/shane-legg': 'background_profile_does_not_prove_target_video_claim',
    'https://tedai-sanfrancisco.ted.com/speakers/shane-legg': 'profile_page_does_not_prove_target_video_claim',
  },
  'prune-tail:cmjwi2a2f000tbxr3s7hpt39d': {
    'https://hub.baai.ac.cn/view/37642': 'background_article_does_not_prove_target_glm47_claim',
  },
  'prune-tail:cmjtxpiew0403rmtbih8r6re6': {
    'https://learn.microsoft.com/zh-cn/shows/microsoft-research-luminaries/eric-horvitz-on-new-era-of-artificial-intelligence': 'background_interview_does_not_prove_target_ai_biology_claim',
  },
  'prune-tail:cmju14au00aqprmtb7w2xezt5': {
    'https://jan.leike.name/publications.html': 'publication_page_does_not_prove_target_arxiv_paper',
  },
  'prune-tail:cmjtxpgx003ztrmtbrnkrive0': {
    'https://learn.microsoft.com/zh-cn/shows/microsoft-research-luminaries/eric-horvitz-on-new-era-of-artificial-intelligence': 'background_interview_does_not_prove_target_arxiv_claim',
  },
  'prune-tail:cmjtxpgaw03zprmtbudt4ky5u': {
    'https://learn.microsoft.com/zh-cn/shows/microsoft-research-luminaries/eric-horvitz-on-new-era-of-artificial-intelligence': 'background_interview_does_not_prove_target_ama_audio',
  },
  'prune-tail:cmjtzrxxz05zormtbnlwqzvib': {
    'https://research.google/people/jeff': 'profile_page_does_not_prove_target_research_overview_claim',
  },
  'prune-tail:cmjtvqbia00vcrmtbs0m4ey4w': {
    'https://alexw.substack.com/archive': 'substack_archive_not_sufficient_primary_source',
  },
  'prune-tail:cmjtxmc0703bgrmtbcgjsy7fj': {
    'https://www.anthropic.com/news/chris-olah-pope-leo-encyclical': 'background_page_does_not_prove_acl_anthology_claim',
    'https://80000hours.org/podcast/episodes/chris-olah-interpretability-research': 'background_interview_does_not_prove_acl_anthology_claim',
  },
  'prune-tail:cmjyee4vo000cot7iux88ckcp': {
    'https://www.sina.cn/news/detail/5251658575250850.html': 'background_article_does_not_prove_target_mastodon_claim',
  },
  'prune-tail:cmju1r9850f8nrmtb49houu1v': {
    'https://time.com/author/yoshua-bengio': 'background_author_page_does_not_prove_target_ted_claim',
  },
  'prune-tail:cmjtxjf5802q8rmtb01uhbllu': {
    'https://www.tsinghua.edu.cn/info/1182/117910.htm': 'same_name_cross_person_risk_does_not_prove_cuhk_shenzhen_target',
    'https://news.wit.edu.cn/info/1041/390241.htm': 'same_name_cross_person_risk_does_not_prove_target_person',
    'http://junzhu.chem8.org/contact': 'same_name_cross_person_risk_does_not_prove_target_ai_person',
  },
  'prune-tail:cmjtxlxqo036zrmtbpa0306xx': {
    'https://xiaguangshe.com/8066': 'secondary_career_announcement_needs_primary_confirmation',
  },
  'prune-tail:cmju15rlr0b0qrmtbf5p1e91h': {
    'https://www.mittrchina.com/news/detail/12734': 'interview_does_not_prove_target_quantum_computing_statement',
  },
  'prune-tail:cmjtxq9rb046grmtbwu191mqt': {
    'https://podcasts.apple.com/us/podcast/the-ai-pioneer-developing-new-kinds-of-medicine/id1602541473?i=1000716524176': 'podcast_page_not_needed_when_ted_primary_source_exists',
  },
  'prune-tail:cmjse3ul1001nc6jta6hh5uc1': {
    'https://www.cnbc.com/2025/10/08/cnbc-transcript-nvidia-co-founder-president-ceo-jensen-huang-speaks-with-cnbcs-squawk-box-today.html': 'news_transcript_does_not_prove_target_long_form_interview_summary',
  },
  'prune-tail:cmjse3uky001hc6jtl9yi1mzi': {
    'https://www.youtube.com/watch?v=vOvQSqY7Jgc': 'low_authority_rehosted_clip_not_primary_source',
  },
  'prune-tail:cmjtvpyur00sermtbo4554ol7': {
    'https://blog.eladgil.com/p/discussion-w-arthur-mensch-ceo-of': 'background_interview_does_not_contain_target_quote',
    'https://www.youtube.com/watch?v=e7Y84vpWhkU': 'background_video_does_not_contain_target_quote',
  },
  'prune-tail:cmjxnlkp60001a6elgb5ubdkh': {
    'https://blog.vibecoder.me/skills-slash-commands-subagents-claude-code-primitives': 'secondary_blog_not_primary_source_for_target_workflow_quote',
  },
  'prune-tail:cmjxnlqax000na6eldcwxc7xo': {
    'https://snowan.gitbook.io/study-notes/ai/claude-code/boris-cherny-cc-tips': 'third_party_notes_not_primary_source_for_target_workflow_quote',
  },
  'prune-tail:cmjxnlsgo0011a6elum6o9oi4': {
    'https://stationf.co/news/boris-cherny': 'background_interview_does_not_prove_target_quote',
    'https://www.lennysnewsletter.com/p/head-of-claude-code-what-happens': 'background_interview_does_not_prove_target_quote',
  },
  'prune-tail:cmjxnlr7w000ta6elyolsa1ah': {
    'https://www.lennysnewsletter.com/p/head-of-claude-code-what-happens': 'background_interview_does_not_prove_target_feature_support_quote',
    'https://www.developing.dev/p/boris-cherny-creator-of-claude-code': 'background_interview_does_not_prove_target_feature_support_quote',
  },
  'prune-tail:cmjwujo1v002vy6e2mvnsx4eo': {
    'https://www.forbes.com/profile/daniela-amodei': 'background_profile_not_needed_when_primary_fundraising_source_exists',
  },
  'prune-tail:cmjwujkml002ny6e2npnwc338': {
    'https://www.forbes.com/profile/daniela-amodei': 'background_profile_does_not_prove_target_hiring_claim',
  },
  'prune-tail:cmjwujngp002ty6e2gtn0fekn': {
    'https://www.youtube.com/watch?v=8cJAXfbuzx0': 'video_page_not_needed_when_institution_event_page_exists',
  },
  'prune-tail:cmjtvmit1006hrmtb0gau9zv5': {
    'https://www.wired.com/story/google-deepmind-demis-hassabis-gemini-ai': 'background_gemini_article_does_not_prove_target_gemini3_claim',
  },
  'prune-tail:cmjse4zbp0037c6jt69f4sba4': {
    'https://www.wired.com/story/elon-musk-launches-grokipedia-wikipedia-competitor': 'loaded_secondary_article_not_needed_when_neutral_reporting_exists',
  },
  'prune-tail:cmjtxqwpo04e1rmtb8fe5ay04': {
    'https://ml-summit.org/speaker/626?uid=c1014&lang=en': 'background_profile_does_not_prove_target_codex_claim',
  },
  'prune-tail:cmju1hns50dahrmtbq86peghr': {
    'https://time.com/collections/time100-ai/6310599/noam-shazeer': 'background_profile_does_not_prove_target_competitor_mission_claim',
    'https://www.dwarkesh.com/p/jeff-dean-and-noam-shazeer': 'background_interview_does_not_prove_target_competitor_mission_claim',
  },
  'prune-tail:cmjv37e5b0009v6e8ecmmh0p7': {
    'https://techcrunch.com/2026/05/20/sam-altman-makes-mic-drop-offer-to-every-y-combinator-startup': 'background_article_does_not_prove_target_cost_reduction_claim',
  },
  'prune-tail:cmjv37e5b000av6e84p1ou87r': {
    'https://www.youtube.com/watch?v=V979Wd1gmTU': 'background_video_does_not_prove_target_gpt51_claim',
  },
  'prune-tail:cmjwhjhnl001n56p4ute3d6aw': {
    'https://research.google/people/107923': 'profile_page_does_not_prove_target_weather_ai_claim',
  },
  'prune-tail:cmju0pvie085mrmtbhq3ojjkd': {
    'https://cn.dataconomy.com/2025/03/06/%E4%BA%9A%E5%8E%86%E5%85%8B%C2%B7%E6%8B%89%E5%BE%B7%E7%A6%8F%E5%BE%B7%EF%BC%88alec-radford%EF%BC%89%E7%A6%BB%E5%BC%80openai%EF%BC%8C%E7%8E%B0%E5%9C%A8%E4%BB%96%E8%A2%AB%E8%AF%89%E8%AF%B8%E8%AF%89': 'background_article_does_not_prove_target_bert_gpt_claim',
  },
  'prune-tail:cmjwi2bhw000xbxr3x892gcmg': {
    'https://hub.baai.ac.cn/view/37642': 'background_article_does_not_prove_target_glm46_poll_claim',
  },
  'prune-tail:cmjtxpi4w0401rmtb2wbv30vu': {
    'https://learn.microsoft.com/zh-cn/shows/microsoft-research-luminaries/eric-horvitz-on-new-era-of-artificial-intelligence': 'background_interview_does_not_prove_target_ai_biology_claim',
  },
  'prune-tail:cmjtxq6et044wrmtb01zdqycb': {
    'https://www.yeeyi.com/news/details/2588902': 'secondary_repost_does_not_prove_target_x_claim',
  },
  'prune-tail:cmjtxolzc03szrmtbb60yf8xt': {
    'https://research.google/people/jeff': 'profile_page_does_not_prove_target_gemini_robotics_claim',
  },
  'prune-tail:cmjtxoiwv03sdrmtbr9qrwots': {
    'https://research.google/people/jeff': 'profile_page_does_not_prove_target_productive_2025_claim',
  },
  'prune-tail:cmju0u83k08lqrmtbz3gt4we7': {
    'https://www.anthropic.com/news/chris-olah-pope-leo-encyclical': 'background_page_does_not_prove_target_gpt4_claim',
  },
  'prune-tail:cmju0o0ds07yqrmtbm1clbgh3': {
    'https://www.therundown.ai/p/exclusive-interview-with-google-deepmind-ceo-demis-hassabis': 'low_authority_newsletter_does_not_prove_target_gemini3_claim',
    'https://sources.news/p/demis-hassibas-on-gemini-3-world': 'secondary_aggregator_does_not_prove_target_gemini3_claim',
  },
  'prune-tail:cmjtvs350014vrmtbxlh93nj0': {
    'https://www.forbes.com/sites/kenrickcai/2023/06/04/stable-diffusion-emad-mostaque-stability-ai-exaggeration': 'background_controversy_article_not_needed_for_leadership_claim',
  },
  'prune-tail:cmjtvnprh00eprmtbgebxvoda': {
    'https://greylock.com/firm-news/welcome-mustafa-suleyman': 'background_profile_does_not_prove_target_web3_claim',
    'https://greylock.com/team/mustafa-suleyman': 'profile_page_does_not_prove_target_web3_claim',
  },
  'prune-tail:cmjtxml4i03cormtbci9tjm4h': {
    'https://www.anthropic.com/news/chris-olah-pope-leo-encyclical': 'background_page_does_not_prove_target_interpretability_qa_claim',
  },
  'prune-tail:cmjtvqy200106rmtbfk8f2imo': {
    'https://venturebeat.com/ai/mistral-launches-powerful-devstral-2-coding-model-including-open-source': 'product_article_does_not_name_target_person',
    'https://www.ithome.com.tw/news/169127': 'product_article_does_not_name_target_person',
  },
  'prune-tail:cmjtxl761031mrmtbl1iedufw': {
    'https://www.microsoft.com/en-us/behind-the-tech/mira-murati-chief-technology-officer-openai': 'background_interview_does_not_prove_target_synthetic_voices_claim',
  },
  'prune-tail:cmju0qrhr08a4rmtbj6qbahpv': {
    'https://ai.meta.com/people/396469589677838/yann-lecun': 'profile_page_does_not_prove_target_co_teaching_claim',
  },
  'prune-tail:cmjtxlms20355rmtbyh7sed51': {
    'https://www.youtube.com/watch?v=BnpB3GrpsfM': 'video_page_does_not_prove_target_newmu_handle',
  },
  'prune-tail:cmjsmr9so0015q8o9vbaj3slp': {
    'https://fs.blog/knowledge-project-podcast/greg-brockman': 'background_podcast_does_not_prove_target_gpt52_report_claim',
  },
  'prune-tail:cmjtvmlhl0087rmtbxzzwkss2': {
    'https://developer.volcengine.com/articles/7444834262626336778': 'secondary_community_biography_not_needed_when_primary_profile_exists',
  },
  'prune-tail:cmju0o1pn07yurmtbihh8l1zu': {
    'https://achievement.org/achiever/demis-hassabis-ph-d': 'background_profile_not_needed_when_interview_source_exists',
  },
  'prune-tail:cmjs7hbx300158028u7xnjr4o': {
    'https://www.nobelprize.org/prizes/physics/2024/hinton/podcast': 'background_podcast_page_not_needed_when_cifar_source_exists',
  },
  'prune-tail:cmjrz1ax50014b28tw6j90eeg': {
    'https://www.forbes.com/profile/sam-altman': 'background_profile_does_not_prove_target_congress_hearing_claim',
    'https://www.britannica.com/money/Sam-Altman': 'background_profile_does_not_prove_target_congress_hearing_claim',
  },
  'prune-tail:cmjtxlvqp036frmtbmtu4r7qp': {
    'https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf': 'background_paper_does_not_prove_target_generation_samples_claim',
    'https://news.qq.com/rain/a/20241220A03P7600': 'background_career_article_does_not_prove_target_generation_samples_claim',
  },
  'prune-tail:cmjtvo1lb00gfrmtbskffm0kl': {
    'https://mustafa-suleyman.ai': 'profile_page_does_not_prove_target_youtube_video',
  },
  'prune-tail:cmjtxhufw02cgrmtbsysq54rm': {
    'https://www.noamshazeer.com': 'profile_page_does_not_prove_target_gemini_blog_claim',
    'https://www.themarque.com/profile/noam-shazeer': 'profile_page_does_not_prove_target_gemini_blog_claim',
  },
  'prune-tail:cmjwirby3000nl6wwpc945g1n': {
    'https://www.youtube.com/watch?v=fCoavgGZ64Y': 'background_video_does_not_prove_target_openai_results_claim',
  },
  'prune-tail:cmjtvo27q00gprmtbsyf39h7i': {
    'https://blogs.microsoft.com/blog/2024/03/19/mustafa-suleyman-deepmind-and-inflection-co-founder-joins-microsoft-to-lead-copilot': 'background_role_announcement_does_not_prove_target_copilot_model_claim',
  },
  'prune-tail:cmjtvo1wj00gjrmtbkk5e0q2j': {
    'https://blogs.microsoft.com/blog/2024/03/19/mustafa-suleyman-deepmind-and-inflection-co-founder-joins-microsoft-to-lead-copilot': 'background_role_announcement_does_not_prove_target_copilot_holiday_feature_claim',
  },
};

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function canonicalUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return String(url || '');
  }
}

function hostRejectReason(host) {
  const value = String(host || '').toLowerCase();
  for (const [blockedHost, reason] of Object.entries(REJECTED_HOSTS)) {
    if (value === blockedHost || value.endsWith(`.${blockedHost}`)) return reason;
  }
  return null;
}

function countBy(rows, getKey) {
  return rows.reduce((acc, row) => {
    const key = getKey(row) || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function table(rows, columns) {
  const header = `| ${columns.map((col) => col.label).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((col) => String(col.value(row) ?? '').replace(/\n/g, '<br>').replace(/\|/g, '\\|')).join(' | ')} |`);
  return [header, divider, ...body].join('\n');
}

function curateRow(row) {
  const removedSources = [];
  const keptSources = [];

  for (const source of row.selectedSources || []) {
    const host = (source.host || hostOf(source.url)).toLowerCase();
    const url = canonicalUrl(source.url);
    const reason = REJECTED_CLAIM_URLS[row.claimId]?.[url] || REJECTED_URLS[url] || hostRejectReason(host);
    if (reason) {
      removedSources.push({
        host,
        url: source.url,
        title: source.title || '',
        reason,
      });
      continue;
    }
    keptSources.push(source);
  }

  if (!removedSources.length) {
    return {
      row: {
        ...row,
        manualCuration: {
          status: 'unchanged',
          removedSources: [],
        },
      },
      removedSources,
    };
  }

  const curated = {
    ...row,
    selectedSources: keptSources,
    manualCuration: {
      status: keptSources.length ? 'sources_removed' : 'deferred_to_human_review',
      removedSources,
    },
  };

  if (!keptSources.length) {
    curated.decision = 'human_review';
    curated.confidence = Math.min(Number(row.confidence) || 0, 0.45);
    curated.blockers = [
      ...new Set([
        ...(Array.isArray(row.blockers) ? row.blockers : []),
        'manual_curated_all_selected_sources_removed',
      ]),
    ];
    curated.rationale = `${row.rationale || ''}\n\nManual curation: all selected sources were removed for source-quality reasons; keep this row for human review.`.trim();
  }

  return { row: curated, removedSources };
}

function topEntries(counts, limit = 30) {
  return Object.fromEntries(
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit),
  );
}

function writeReport(summary, curatedRows, removals) {
  const lines = [
    '# Prune Tail Refetch Tavily MiMo Curated',
    '',
    `Generated at: ${summary.generatedAt}`,
    `Input: ${summary.input}`,
    `Output: ${summary.output}`,
    '',
    '## Counts',
    '',
    table([
      { metric: 'input rows', value: summary.inputRows },
      { metric: 'output rows', value: summary.outputRows },
      { metric: 'input selected sources', value: summary.inputSelectedSources },
      { metric: 'output selected sources', value: summary.outputSelectedSources },
      { metric: 'removed selected sources', value: summary.removedSelectedSources },
      { metric: 'rows changed', value: summary.rowsChanged },
      { metric: 'rows deferred to human review', value: summary.rowsDeferredToHumanReview },
    ], [
      { label: 'Metric', value: (row) => row.metric },
      { label: 'Value', value: (row) => row.value },
    ]),
    '',
    '## Removed Hosts',
    '',
    table(Object.entries(summary.removedHosts).map(([host, count]) => ({ host, count })), [
      { label: 'Host', value: (row) => row.host },
      { label: 'Count', value: (row) => row.count },
    ]),
    '',
    '## Removed Sources',
    '',
    table(removals, [
      { label: 'Person', value: (row) => row.person },
      { label: 'Decision before', value: (row) => row.decisionBefore },
      { label: 'Host', value: (row) => row.host },
      { label: 'Title', value: (row) => row.title },
      { label: 'Reason', value: (row) => row.reason },
    ]),
    '',
    '## Deferred Rows',
    '',
    table(curatedRows.filter((row) => row.manualCuration?.status === 'deferred_to_human_review'), [
      { label: 'Person', value: (row) => row.person },
      { label: 'Claim', value: (row) => row.claimId },
      { label: 'Target', value: (row) => row.target?.objectLabel || row.target?.field || '' },
      { label: 'Blockers', value: (row) => (row.blockers || []).join('; ') },
    ]),
    '',
  ];

  fs.writeFileSync(REPORT_OUT, `${lines.join('\n')}\n`);
}

const rows = readJsonl(INPUT);
const curatedRows = [];
const removals = [];

for (const row of rows) {
  const beforeDecision = row.decision;
  const result = curateRow(row);
  curatedRows.push(result.row);
  for (const removed of result.removedSources) {
    removals.push({
      person: row.person,
      claimId: row.claimId,
      decisionBefore: beforeDecision,
      ...removed,
    });
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  input: INPUT,
  output: OUT,
  report: REPORT_OUT,
  inputRows: rows.length,
  outputRows: curatedRows.length,
  inputSelectedSources: rows.reduce((sum, row) => sum + (row.selectedSources?.length || 0), 0),
  outputSelectedSources: curatedRows.reduce((sum, row) => sum + (row.selectedSources?.length || 0), 0),
  removedSelectedSources: removals.length,
  rowsChanged: curatedRows.filter((row) => row.manualCuration?.status !== 'unchanged').length,
  rowsDeferredToHumanReview: curatedRows.filter((row) => row.manualCuration?.status === 'deferred_to_human_review').length,
  byDecision: countBy(curatedRows, (row) => row.decision),
  removedHosts: topEntries(countBy(removals, (row) => row.host), 30),
  keptHosts: topEntries(countBy(curatedRows.flatMap((row) => row.selectedSources || []), (source) => source.host || hostOf(source.url)), 30),
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${curatedRows.map((row) => JSON.stringify(row)).join('\n')}\n`);
fs.writeFileSync(SUMMARY_OUT, `${JSON.stringify(summary, null, 2)}\n`);
writeReport(summary, curatedRows, removals);

console.log(JSON.stringify({ out: OUT, summaryOut: SUMMARY_OUT, reportOut: REPORT_OUT, summary }, null, 2));
