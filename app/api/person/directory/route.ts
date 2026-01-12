import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

// 允许边缘缓存，但客户端始终重新验证
export const dynamic = 'force-dynamic';
export const revalidate = 60; // ISR: 60秒后重新验证

// 机构名称映射 - 将显示名称映射到数据库中的各种变体
// 注意：数据库中可能存储组合格式如 "月之暗面 Kimi"、"清华大学、智谱AI" 等
const ORG_MAPPING: Record<string, string[]> = {
  // 海外大厂
  'OpenAI': ['OpenAI', 'OpenAI基金会', 'OpenAI Foundation', '开放人工智能基金会'],
  'Google': ['Google', '谷歌', '谷歌DeepMind', '谷歌大脑', 'Google Brain', 'Google DeepMind', 'Google Cloud'],
  'DeepMind': ['DeepMind', 'Google DeepMind', '谷歌DeepMind'],
  'Anthropic': ['Anthropic'],
  'Microsoft': ['Microsoft', '微软', '微软研究院', '微软AI', 'Microsoft Research'],
  'Meta': ['Meta', 'Facebook', 'Meta AI', 'FAIR', 'FAIR蒙特利尔', '脸书', 'Meta超级智能实验室'],
  'Apple': ['Apple', '苹果'],
  'Amazon': ['Amazon', 'AWS', '亚马逊'],
  'Tesla': ['Tesla', '特斯拉', '特斯拉公司'],
  'Nvidia': ['Nvidia', 'NVIDIA', '英伟达'],
  // 海外创业公司
  'Hugging Face': ['Hugging Face', 'HuggingFace'],
  'Cohere': ['Cohere'],
  'Mistral': ['Mistral', 'Mistral AI'],
  'xAI': ['xAI', 'X.AI'],
  'Perplexity': ['Perplexity', 'Perplexity AI'],
  // 高校
  'Stanford': ['Stanford', '斯坦福大学', 'Stanford University'],
  'MIT': ['MIT', '麻省理工学院', 'Massachusetts Institute of Technology', '思维机器实验室'],
  'Berkeley': ['Berkeley', 'UC Berkeley', '加州大学伯克利分校'],
  'CMU': ['CMU', '卡内基梅隆大学', 'Carnegie Mellon University'],
  '清华大学': ['清华大学', 'Tsinghua', 'Tsinghua University', '清华大学 NLP', '清华大学、智谱AI', '清华大学、生数科技'],
  '北京大学': ['北京大学', 'PKU', '北大', '北京大学、智源研究院'],
  // 中国公司 - 包含组合格式
  'DeepSeek': ['DeepSeek', '幻方量化', '深度求索'],
  'Kimi': ['Kimi', '月之暗面', 'Moonshot', 'Moonshot AI', '月之暗面 Kimi'],
  '智谱AI': ['智谱AI', 'Zhipu', 'Zhipu AI', '智谱', 'GLM', '清华大学、智谱AI'],
  '百川智能': ['百川智能', 'Baichuan'],
  'MiniMax': ['MiniMax', 'Minimax'],
  '阿里巴巴': ['阿里巴巴', '阿里达摩院', '达摩院', 'Alibaba', '通义'],
  '腾讯': ['腾讯', 'Tencent', '腾讯AI Lab'],
  '字节跳动': ['字节跳动', 'ByteDance', '豆包'],
  '百度': ['百度', 'Baidu', '文心'],
  '小米': ['小米', 'Xiaomi'],
  // 其他创业公司
  '阶跃星辰': ['阶跃星辰', 'Stepfun', 'Stepfun 阶跃星辰'],
  '零一万物': ['零一万物', '创新工场、零一万物'],
  '澜舟科技': ['澜舟科技', '创新工场、澜舟科技'],
  '商汤科技': ['商汤科技'],
  '第四范式': ['第四范式'],
  // 其他
  'Stripe': ['Stripe'],
  'Scale AI': ['Scale AI'],
  'Stability AI': ['Stability AI'],
  'Character.ai': ['Character.ai'],
  'Inflection AI': ['Inflection AI'],
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const start = (page - 1) * limit;

    // 筛选参数
    const topic = searchParams.get('topic');
    const organization = searchParams.get('organization');
    const roleCategory = searchParams.get('roleCategory');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'influenceScore';

    // 构建 WHERE 条件
    const where: Prisma.PeopleWhereInput = {
      status: { not: 'error' }
    };

    // 话题筛选
    if (topic) {
      where.topics = { has: topic };
    }

    // 机构筛选 - 使用映射表进行多变体匹配
    if (organization) {
      const orgVariants = ORG_MAPPING[organization] || [organization];
      where.organization = { hasSome: orgVariants };
    }

    // 角色筛选
    if (roleCategory) {
      where.roleCategory = roleCategory;
    }

    // 搜索
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { aliases: { hasSome: [search] } },
        { organization: { hasSome: [search] } },
        { topics: { hasSome: [search] } }
      ];
    }

    // 排序
    let orderBy: Prisma.PeopleOrderByWithRelationInput = { influenceScore: 'desc' };
    if (sortBy === 'weeklyViewCount') {
      orderBy = { weeklyViewCount: 'desc' };
    } else if (sortBy === 'citationCount') {
      orderBy = { citationCount: 'desc' };
    } else if (sortBy === 'name') {
      orderBy = { name: 'asc' };
    }

    // 查询人物 - 使用并行查询提升性能
    const [people, total] = await Promise.all([
      prisma.people.findMany({
        where,
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          organization: true,
          currentTitle: true,
          topics: true,
          highlights: true,
          roleCategory: true,
          influenceScore: true,
          weeklyViewCount: true,
        },
        orderBy: [orderBy, { name: 'asc' }],
        skip: start,
        take: limit,
      }),
      prisma.people.count({ where })
    ]);

    const hasMore = start + limit < total;

    // 统计信息 - 只在第一页且无筛选时返回，复用 total 避免额外查询
    let stats = null;
    if (page === 1 && !topic && !organization && !roleCategory && !search) {
      stats = {
        totalPeople: total, // 复用已查询的 total，避免额外查询
        totalTopics: 30, // 预定义话题数
        totalOrgs: 30
      };
    }

    // 构建响应并添加缓存头
    const response = NextResponse.json({
      data: people,
      pagination: {
        page,
        limit,
        total,
        hasMore
      },
      ...(stats && { stats })
    });

    // 添加缓存控制头 - 允许 CDN 缓存 60 秒，客户端缓存 10 秒
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

    return response;
  } catch (error: any) {
    console.error('Failed to fetch directory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch directory' },
      { status: 500 }
    );
  }
}
