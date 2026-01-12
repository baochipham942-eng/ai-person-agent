/**
 * YouTube 视频分类和标签脚本
 * 为视频添加分类标签：本人演讲(self_talk)、访谈对话(interview)、他人解读(analysis)
 * 同时提取视频相关的 AI 话题标签
 *
 * 用法: npx tsx scripts/enrich/classify_videos.ts [options]
 *
 * 参数:
 *   --limit=N      限制处理视频数量
 *   --use-ai       使用 AI 进行分类（默认仅规则匹配）
 *   --force-tags   强制重新提取标签
 *   --reclassify   强制重新分类所有视频（用于优化分类精度后重跑）
 */

import { prisma } from '../../lib/db/prisma';
import { chatStructuredCompletion, type ChatMessage } from '../../lib/ai/deepseek';
import { AI_TOPICS } from './enrich_topics_highlights';

type VideoCategory = 'self_talk' | 'interview' | 'analysis';

interface ClassifyResult {
  category: VideoCategory;
  confidence: number;
  tags: string[];  // AI 话题标签
}

// 规则匹配关键词 - 扩展版
const SELF_TALK_PATTERNS = [
  // 英文：演讲/讲座相关
  /\btalk\b/i, /\btalks\b/i, /keynote/i, /lecture/i, /presentation/i, /speech/i,
  /masterclass/i, /tutorial/i, /explains/i, /explaining/i, /walkthrough/i,
  /\bdemo\b/i, /demonstrates/i, /shows how/i, /teaches/i, /teaching/i,
  // 英文：会议/活动相关
  /\bted\b/i, /tedx/i, /summit/i, /conference/i, /symposium/i, /workshop/i,
  /fireside/i, /opening remarks/i, /closing remarks/i, /plenary/i,
  // 英文：直播/个人频道相关
  /livestream/i, /live stream/i, /\blive\b/i, /streaming/i,
  /my thoughts/i, /deep dive/i, /breakdown/i, /overview/i,
  // 中文：演讲/讲座相关
  /演讲/i, /讲座/i, /分享/i, /主题发言/i, /报告/i, /汇报/i,
  /授课/i, /教程/i, /解读/i, /详解/i, /深度解析/i,
  // 中文：直播/个人创作
  /直播/i, /公开课/i, /我的/i
];

const INTERVIEW_PATTERNS = [
  // 英文：访谈相关
  /interview/i, /interviewed/i, /interviewing/i,
  /conversation with/i, /in conversation/i, /dialogue/i,
  /chat with/i, /chatting with/i, /sits down with/i, /sat down/i,
  /talks to/i, /talks with/i, /speaks with/i, /speaking with/i,
  /\bQ\s*&\s*A\b/i, /\bAMA\b/i, /ask me anything/i,
  // 英文：播客/对话节目
  /podcast/i, /episode/i, /\bep\.\s*\d/i, /\b#\d+\b.*\bwith\b/i,
  /hosts?\s+\w+/i, /guests?\s+\w+/i, /featuring/i,
  // 中文：访谈相关
  /对话/i, /访谈/i, /专访/i, /采访/i, /聊/i, /做客/i,
  /问答/i, /圆桌/i, /交流/i, /畅聊/i
];

// 第三方分析/解读的模式（用于主动识别 analysis）
const ANALYSIS_PATTERNS = [
  // 英文：分析/评论相关
  /reaction/i, /reacts to/i, /responding to/i, /response to/i,
  /review of/i, /reviewing/i, /analysis of/i, /analyzing/i,
  /explained$/i, /\bexplained\b.*by/i, /breakdown of/i,
  /what .* thinks/i, /thoughts on/i, /opinion on/i,
  /who is/i, /the story of/i, /biography/i, /profile/i,
  /documentary/i, /tribute/i, /legacy/i,
  // 中文：分析/评论相关
  /解读/i, /分析/i, /评论/i, /点评/i, /盘点/i,
  /揭秘/i, /真相/i, /观点/i, /看法/i
];

/**
 * 使用规则匹配分类视频（仅返回分类，不含标签）
 * 增强版：支持更多模式匹配，包括官方频道判断
 */
function classifyByRules(
  title: string,
  description: string,
  personName: string,
  metadata?: { isOfficial?: boolean; author?: string }
): Omit<ClassifyResult, 'tags'> | null {
  const text = `${title} ${description}`.toLowerCase();
  const titleLower = title.toLowerCase();
  const personKeywords = personName.toLowerCase().split(/\s+/).filter(k => k.length > 2);

  // 检查是否来自官方频道
  const isOfficial = metadata?.isOfficial === true;
  const authorMatchesPerson = metadata?.author && personKeywords.some(k =>
    metadata.author!.toLowerCase().includes(k)
  );

  // 如果是官方频道或作者名匹配，默认为 self_talk 或 interview
  if (isOfficial || authorMatchesPerson) {
    // 检查是否是访谈（即使在官方频道也可能是访谈）
    for (const pattern of INTERVIEW_PATTERNS) {
      if (pattern.test(title)) {
        return { category: 'interview', confidence: 0.95 };
      }
    }
    // 官方频道的其他视频默认为 self_talk
    return { category: 'self_talk', confidence: 0.9 };
  }

  // 检查标题/描述是否包含人物名字
  const mentionsPerson = personKeywords.some(k => text.includes(k));

  // 优先级 1: 检查是否是明显的第三方分析
  for (const pattern of ANALYSIS_PATTERNS) {
    if (pattern.test(title)) {
      return { category: 'analysis', confidence: 0.85 };
    }
  }

  // 优先级 2: 如果提到人物，检查演讲/访谈模式
  if (mentionsPerson) {
    // 本人演讲
    for (const pattern of SELF_TALK_PATTERNS) {
      if (pattern.test(title)) {
        return { category: 'self_talk', confidence: 0.85 };
      }
    }

    // 访谈对话
    for (const pattern of INTERVIEW_PATTERNS) {
      if (pattern.test(title)) {
        return { category: 'interview', confidence: 0.85 };
      }
    }
  }

  // 优先级 3: 即使不提人名，也检查描述中的模式
  for (const pattern of SELF_TALK_PATTERNS) {
    if (pattern.test(title) && description.toLowerCase().includes(personKeywords[0] || '')) {
      return { category: 'self_talk', confidence: 0.7 };
    }
  }

  for (const pattern of INTERVIEW_PATTERNS) {
    if (pattern.test(title) && description.toLowerCase().includes(personKeywords[0] || '')) {
      return { category: 'interview', confidence: 0.7 };
    }
  }

  // 无法确定
  return null;
}

/**
 * 使用 DeepSeek AI 分类视频并提取话题标签
 */
async function classifyByAI(title: string, description: string, personName: string): Promise<ClassifyResult> {
  const systemPrompt = `你是一个 AI 视频内容分析专家。根据视频标题和描述：

1. 判断视频类型：
   - self_talk: 该人物亲自演讲、分享、讲座、TED Talk、会议主题发言等
   - interview: 该人物接受采访、参与对话、播客访谈等
   - analysis: 第三方对该人物的分析、报道、评论、总结等

2. 提取视频涉及的 AI 话题标签（从以下列表选择 1-3 个最相关的）：
   ${AI_TOPICS.join(', ')}

返回 JSON: { "category": "self_talk|interview|analysis", "confidence": 0.0-1.0, "tags": ["话题1", "话题2"] }`;

  const userPrompt = `人物: ${personName}
视频标题: ${title}
视频描述: ${description.slice(0, 500)}

请分析视频类型和话题标签。`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  try {
    const result = await chatStructuredCompletion<ClassifyResult>(messages, {
      temperature: 0.1,
      maxTokens: 200
    });

    // 验证话题是否在预定义列表中
    const validTags = (result.tags || []).filter(t =>
      AI_TOPICS.some(at => at.toLowerCase() === t.toLowerCase())
    );

    return {
      category: result.category || 'analysis',
      confidence: result.confidence || 0.5,
      tags: validTags.slice(0, 3)
    };
  } catch (error) {
    console.error('  AI 分类失败:', error);
    return { category: 'analysis', confidence: 0.3, tags: [] };
  }
}

/**
 * 仅使用 AI 提取视频话题标签（用于已分类但无标签的视频）
 */
async function extractTagsByAI(title: string, description: string): Promise<string[]> {
  const systemPrompt = `你是一个 AI 视频内容分析专家。根据视频标题和描述，提取视频涉及的 AI 话题标签。

从以下预定义话题列表中选择 1-3 个最相关的：
${AI_TOPICS.join(', ')}

返回 JSON: { "tags": ["话题1", "话题2"] }`;

  const userPrompt = `视频标题: ${title}
视频描述: ${description.slice(0, 500)}

请提取话题标签。`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  try {
    const result = await chatStructuredCompletion<{ tags: string[] }>(messages, {
      temperature: 0.1,
      maxTokens: 100
    });

    // 验证话题是否在预定义列表中
    const validTags = (result.tags || []).filter(t =>
      AI_TOPICS.some(at => at.toLowerCase() === t.toLowerCase())
    );

    return validTags.slice(0, 3);
  } catch (error) {
    console.error('  AI 提取标签失败:', error);
    return [];
  }
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
  const useAI = args.includes('--use-ai');
  const forceTags = args.includes('--force-tags');
  const reclassify = args.includes('--reclassify'); // 强制重新分类所有视频

  console.log('🎬 开始分类 YouTube 视频...\n');
  console.log(`使用 AI 辅助: ${useAI ? '是' : '否'}`);
  console.log(`强制更新标签: ${forceTags ? '是' : '否'}`);
  console.log(`强制重新分类: ${reclassify ? '是' : '否'}\n`);

  // 1. 获取所有 YouTube 视频及其对应的人物
  const videos = await prisma.rawPoolItem.findMany({
    where: {
      sourceType: 'youtube',
    },
    select: {
      id: true,
      title: true,
      text: true,
      metadata: true,
      person: {
        select: {
          name: true,
          aliases: true,
        }
      }
    },
    take: limit,
    orderBy: { fetchedAt: 'desc' }
  });

  console.log(`📋 找到 ${videos.length} 个视频\n`);

  let classifiedCount = 0;
  let taggedCount = 0;
  let ruleMatchCount = 0;
  let aiMatchCount = 0;
  const stats: Record<VideoCategory, number> = {
    self_talk: 0,
    interview: 0,
    analysis: 0
  };

  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    const personName = video.person.name;
    const personNames = [personName, ...(video.person.aliases || [])].join(' ');

    const metadata = (video.metadata || {}) as Record<string, any>;
    const hasCategory = !!metadata.videoCategory;
    const hasTags = metadata.tags && metadata.tags.length > 0;

    // 如果已分类且有标签（且不强制更新/重新分类），跳过
    if (hasCategory && hasTags && !forceTags && !reclassify) {
      console.log(`[${i + 1}/${videos.length}] 已完成: ${video.title.slice(0, 50)}...`);
      continue;
    }

    console.log(`[${i + 1}/${videos.length}] ${video.title.slice(0, 50)}...`);

    let newMetadata = { ...metadata };

    // 如果需要分类（未分类或强制重新分类）
    if (!hasCategory || reclassify) {
      // 先尝试规则匹配（传入 metadata 以利用 isOfficial 和 author 信息）
      const ruleResult = classifyByRules(video.title, video.text || '', personNames, {
        isOfficial: metadata.isOfficial,
        author: metadata.author
      });

      if (ruleResult) {
        ruleMatchCount++;
        newMetadata.videoCategory = ruleResult.category;
        newMetadata.videoCategoryConfidence = ruleResult.confidence;
        console.log(`  规则分类: ${ruleResult.category} (${ruleResult.confidence})`);

        // 规则匹配成功后，如果需要标签且使用 AI
        if (!hasTags && useAI) {
          const tags = await extractTagsByAI(video.title, video.text || '');
          if (tags.length > 0) {
            newMetadata.tags = tags;
            taggedCount++;
            console.log(`  AI 标签: ${tags.join(', ')}`);
          }
          await new Promise(r => setTimeout(r, 200));
        }

        classifiedCount++;
        stats[ruleResult.category]++;
      } else if (useAI) {
        // 使用 AI 同时分类和提取标签
        const result = await classifyByAI(video.title, video.text || '', personNames);
        aiMatchCount++;
        newMetadata.videoCategory = result.category;
        newMetadata.videoCategoryConfidence = result.confidence;
        if (result.tags.length > 0) {
          newMetadata.tags = result.tags;
          taggedCount++;
        }
        console.log(`  AI 分类: ${result.category} (${result.confidence})`);
        if (result.tags.length > 0) {
          console.log(`  AI 标签: ${result.tags.join(', ')}`);
        }
        classifiedCount++;
        stats[result.category]++;
        await new Promise(r => setTimeout(r, 200));
      } else {
        // 默认分类为 analysis，无标签
        newMetadata.videoCategory = 'analysis';
        newMetadata.videoCategoryConfidence = 0.5;
        console.log(`  默认: analysis`);
        classifiedCount++;
        stats.analysis++;
      }
    } else if ((!hasTags || forceTags) && useAI) {
      // 已分类但需要标签
      const tags = await extractTagsByAI(video.title, video.text || '');
      if (tags.length > 0) {
        newMetadata.tags = tags;
        taggedCount++;
        console.log(`  AI 标签: ${tags.join(', ')}`);
      }
      await new Promise(r => setTimeout(r, 200));
    }

    // 更新 metadata
    await prisma.rawPoolItem.update({
      where: { id: video.id },
      data: { metadata: newMetadata }
    });
  }

  console.log('\n📊 处理完成');
  console.log(`  总视频数: ${videos.length}`);
  console.log(`  新分类数: ${classifiedCount}`);
  console.log(`  新标签数: ${taggedCount}`);
  console.log(`  规则匹配: ${ruleMatchCount}`);
  console.log(`  AI 处理: ${aiMatchCount}`);
  console.log('\n分类统计:');
  console.log(`  本人演讲: ${stats.self_talk}`);
  console.log(`  访谈对话: ${stats.interview}`);
  console.log(`  他人解读: ${stats.analysis}`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
