/**
 * 手动维护 Top 人物的真实 AI 产品数据
 *
 * 产品类型说明：
 * - AI Model: 大语言模型、图像模型等
 * - Platform: AI 平台、API 服务
 * - Tool: 开发工具、框架
 * - Service: 商业服务
 * - Hardware: AI 芯片、硬件
 *
 * 运行: npx tsx scripts/enrich/enrich_products_manual.ts
 */

import { prisma } from '../../lib/db/prisma';

interface Product {
  name: string;
  org?: string;
  year?: string | number;
  description: string;
  url?: string;
  icon?: string;
  logo?: string;
  category?: string; // AI Model, Platform, Tool, Framework, Service, Hardware
  stats?: {
    users?: string;
    revenue?: string;
    valuation?: string;
    downloads?: string;
  };
  role?: string; // founder, co-creator, lead, contributor
}

// Top 人物产品数据
const MANUAL_PRODUCTS: Record<string, Product[]> = {
  // Sam Altman - OpenAI CEO
  'Sam Altman': [
    {
      name: 'ChatGPT',
      org: 'OpenAI',
      year: 2022,
      description: '革命性的对话 AI，开启大语言模型消费级应用时代',
      url: 'https://chat.openai.com',
      icon: '💬',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg',
      category: 'Platform',
      stats: { users: '200M+ weekly' },
      role: 'founder',
    },
    {
      name: 'GPT-4',
      org: 'OpenAI',
      year: 2023,
      description: '多模态大语言模型，展现强大推理和创作能力',
      url: 'https://openai.com/gpt-4',
      icon: '🧠',
      category: 'AI Model',
      stats: { users: '100M+' },
      role: 'founder',
    },
    {
      name: 'DALL-E 3',
      org: 'OpenAI',
      year: 2023,
      description: '文生图 AI 模型，集成于 ChatGPT',
      url: 'https://openai.com/dall-e-3',
      icon: '🎨',
      category: 'AI Model',
      role: 'founder',
    },
    {
      name: 'Sora',
      org: 'OpenAI',
      year: 2024,
      description: '文生视频 AI 模型，可生成高质量长视频',
      url: 'https://openai.com/sora',
      icon: '🎬',
      category: 'AI Model',
      role: 'founder',
    },
    {
      name: 'OpenAI API',
      org: 'OpenAI',
      year: 2020,
      description: '面向开发者的 AI API 平台',
      url: 'https://platform.openai.com',
      icon: '🔌',
      category: 'Platform',
      stats: { users: '2M+ developers' },
      role: 'founder',
    },
  ],

  // Dario Amodei - Anthropic CEO
  'Dario Amodei': [
    {
      name: 'Claude',
      org: 'Anthropic',
      year: 2023,
      description: 'Anthropic 的 AI 助手产品族，面向聊天与开发者 API 场景，强调安全、有用、可控的交互体验。',
      url: 'https://www.anthropic.com/news/introducing-claude',
      icon: '🤖',
      logo: 'https://www.anthropic.com/images/icons/apple-touch-icon.png',
      category: 'Product',
      role: 'co-founder / CEO',
    },
    {
      name: 'Constitutional AI',
      org: 'Anthropic',
      year: 2022,
      description: 'Anthropic 提出的 AI 对齐方法，用原则列表和 AI 反馈训练更无害、更可控的助手。',
      url: 'https://www.anthropic.com/research/constitutional-ai-harmlessness-from-ai-feedback',
      icon: '📜',
      category: 'Method',
      role: 'co-creator',
    },
  ],

  // Demis Hassabis - DeepMind CEO
  'Demis Hassabis': [
    {
      name: 'AlphaGo',
      org: 'DeepMind',
      year: 2016,
      description: '首个击败围棋世界冠军的 AI 系统',
      url: 'https://deepmind.google/technologies/alphago/',
      icon: '⚫',
      category: 'AI Model',
      role: 'founder',
    },
    {
      name: 'AlphaFold',
      org: 'DeepMind',
      year: 2020,
      description: '解决蛋白质折叠问题的 AI，革命性科学突破',
      url: 'https://alphafold.ebi.ac.uk',
      icon: '🧬',
      category: 'AI Model',
      stats: { users: '2M+ researchers' },
      role: 'founder',
    },
    {
      name: 'Gemini',
      org: 'Google DeepMind',
      year: 2023,
      description: 'Google 最强多模态 AI 模型',
      url: 'https://gemini.google.com',
      icon: '♊',
      category: 'AI Model',
      stats: { users: '100M+' },
      role: 'founder',
    },
    {
      name: 'AlphaGeometry',
      org: 'DeepMind',
      year: 2024,
      description: '可解决国际数学奥林匹克几何题的 AI',
      url: 'https://deepmind.google/discover/blog/alphageometry-an-olympiad-level-ai-system-for-geometry/',
      icon: '📐',
      category: 'AI Model',
      role: 'founder',
    },
  ],

  // Greg Brockman - OpenAI President
  'Greg Brockman': [
    {
      name: 'ChatGPT',
      org: 'OpenAI',
      year: 2022,
      description: '革命性的对话 AI，开启大语言模型消费级应用时代',
      url: 'https://chat.openai.com',
      icon: '💬',
      category: 'Platform',
      stats: { users: '200M+ weekly' },
      role: 'co-creator',
    },
    {
      name: 'GPT-4',
      org: 'OpenAI',
      year: 2023,
      description: '多模态大语言模型，展现强大推理和创作能力',
      url: 'https://openai.com/gpt-4',
      icon: '🧠',
      category: 'AI Model',
      role: 'co-creator',
    },
    {
      name: 'Codex',
      org: 'OpenAI',
      year: 2021,
      description: 'AI 编程助手，驱动 GitHub Copilot',
      url: 'https://openai.com/blog/openai-codex',
      icon: '💻',
      category: 'AI Model',
      role: 'lead',
    },
    {
      name: 'OpenAI API',
      org: 'OpenAI',
      year: 2020,
      description: '面向开发者的 AI API 平台',
      url: 'https://platform.openai.com',
      icon: '🔌',
      category: 'Platform',
      role: 'co-creator',
    },
  ],

  // Ilya Sutskever - SSI
  'Ilya Sutskever': [
    {
      name: 'GPT-3',
      org: 'OpenAI',
      year: 2020,
      description: '1750亿参数大语言模型，展示规模涌现能力',
      url: 'https://openai.com/blog/gpt-3-apps',
      icon: '🧠',
      category: 'AI Model',
      role: 'lead',
    },
    {
      name: 'GPT-4',
      org: 'OpenAI',
      year: 2023,
      description: '多模态大语言模型，展现强大推理能力',
      url: 'https://openai.com/gpt-4',
      icon: '🧠',
      category: 'AI Model',
      role: 'lead',
    },
    {
      name: 'Safe Superintelligence Inc.',
      org: 'SSI',
      year: 2024,
      description: '专注安全超级智能研发的新公司',
      url: 'https://ssi.inc',
      icon: '🛡️',
      category: 'Platform',
      role: 'founder',
    },
  ],

  // Arthur Mensch - Mistral AI CEO
  'Arthur Mensch': [
    {
      name: 'Mistral 7B',
      org: 'Mistral AI',
      year: 2023,
      description: '高效开源模型，性能超越更大规模模型',
      url: 'https://mistral.ai/news/announcing-mistral-7b/',
      icon: '🌀',
      category: 'AI Model',
      stats: { downloads: '10M+' },
      role: 'founder',
    },
    {
      name: 'Mixtral 8x7B',
      org: 'Mistral AI',
      year: 2023,
      description: 'MoE 架构开源模型，性能媲美 GPT-3.5',
      url: 'https://mistral.ai/news/mixtral-of-experts/',
      icon: '🔀',
      category: 'AI Model',
      stats: { downloads: '5M+' },
      role: 'founder',
    },
    {
      name: 'Le Chat',
      org: 'Mistral AI',
      year: 2024,
      description: 'Mistral 官方聊天助手',
      url: 'https://chat.mistral.ai',
      icon: '💬',
      category: 'Platform',
      role: 'founder',
    },
    {
      name: 'Codestral',
      org: 'Mistral AI',
      year: 2024,
      description: '专注代码生成的开源模型',
      url: 'https://mistral.ai/news/codestral/',
      icon: '💻',
      category: 'AI Model',
      role: 'founder',
    },
  ],

  // Aidan Gomez - Cohere CEO
  'Aidan Gomez': [
    {
      name: 'Transformer',
      org: 'Google',
      year: 2017,
      description: '注意力机制架构，现代 AI 基础',
      url: 'https://arxiv.org/abs/1706.03762',
      icon: '🔄',
      category: 'Framework',
      role: 'co-creator',
    },
    {
      name: 'Command R+',
      org: 'Cohere',
      year: 2024,
      description: '企业级 RAG 优化模型',
      url: 'https://cohere.com/command',
      icon: '🎯',
      category: 'AI Model',
      role: 'founder',
    },
    {
      name: 'Cohere API',
      org: 'Cohere',
      year: 2021,
      description: '企业级 NLP API 平台',
      url: 'https://cohere.com',
      icon: '🔌',
      category: 'Platform',
      role: 'founder',
    },
    {
      name: 'Embed v3',
      org: 'Cohere',
      year: 2023,
      description: '多语言嵌入模型，支持 100+ 语言',
      url: 'https://cohere.com/embed',
      icon: '📊',
      category: 'AI Model',
      role: 'founder',
    },
  ],

  // Guillaume Lample - Mistral AI
  'Guillaume Lample': [
    {
      name: 'Mistral 7B',
      org: 'Mistral AI',
      year: 2023,
      description: '高效开源模型，性能超越更大规模模型',
      url: 'https://mistral.ai/news/announcing-mistral-7b/',
      icon: '🌀',
      category: 'AI Model',
      role: 'co-creator',
    },
    {
      name: 'Mixtral 8x7B',
      org: 'Mistral AI',
      year: 2023,
      description: 'MoE 架构开源模型',
      url: 'https://mistral.ai/news/mixtral-of-experts/',
      icon: '🔀',
      category: 'AI Model',
      role: 'co-creator',
    },
    {
      name: 'Codestral',
      org: 'Mistral AI',
      year: 2024,
      description: '专注代码生成的开源模型',
      url: 'https://mistral.ai/news/codestral/',
      icon: '💻',
      category: 'AI Model',
      role: 'lead',
    },
    {
      name: 'XLM',
      org: 'Meta AI',
      year: 2019,
      description: '跨语言预训练模型',
      url: 'https://github.com/facebookresearch/XLM',
      icon: '🌐',
      category: 'AI Model',
      role: 'lead',
    },
  ],

  // Jensen Huang - NVIDIA CEO
  'Jensen Huang': [
    {
      name: 'CUDA',
      org: 'NVIDIA',
      year: 2007,
      description: 'GPU 并行计算平台，AI 训练基础设施',
      url: 'https://developer.nvidia.com/cuda-zone',
      icon: '⚡',
      category: 'Platform',
      stats: { users: '4M+ developers' },
      role: 'founder',
    },
    {
      name: 'H100 GPU',
      org: 'NVIDIA',
      year: 2022,
      description: 'Hopper 架构数据中心 GPU，AI 训练首选',
      url: 'https://www.nvidia.com/en-us/data-center/h100/',
      icon: '🔥',
      category: 'Hardware',
      stats: { revenue: '$26B+ AI revenue' },
      role: 'founder',
    },
    {
      name: 'TensorRT',
      org: 'NVIDIA',
      year: 2016,
      description: '高性能深度学习推理优化器',
      url: 'https://developer.nvidia.com/tensorrt',
      icon: '🚀',
      category: 'Tool',
      role: 'founder',
    },
    {
      name: 'NeMo',
      org: 'NVIDIA',
      year: 2020,
      description: '对话式 AI 开发工具包',
      url: 'https://developer.nvidia.com/nemo',
      icon: '🐠',
      category: 'Framework',
      role: 'founder',
    },
    {
      name: 'Blackwell GPU',
      org: 'NVIDIA',
      year: 2024,
      description: '下一代 AI 芯片架构',
      url: 'https://www.nvidia.com/en-us/data-center/technologies/blackwell-architecture/',
      icon: '⚫',
      category: 'Hardware',
      role: 'founder',
    },
  ],

  // Satya Nadella - Microsoft CEO
  'Satya Nadella': [
    {
      name: 'Microsoft Copilot',
      org: 'Microsoft',
      year: 2023,
      description: 'AI 助手集成于 Windows、Office、Edge',
      url: 'https://copilot.microsoft.com',
      icon: '🤖',
      category: 'Platform',
      stats: { users: '100M+' },
      role: 'founder',
    },
    {
      name: 'GitHub Copilot',
      org: 'Microsoft/GitHub',
      year: 2021,
      description: 'AI 编程助手，代码自动补全',
      url: 'https://github.com/features/copilot',
      icon: '💻',
      category: 'Tool',
      stats: { users: '1.8M+ subscribers' },
      role: 'founder',
    },
    {
      name: 'Azure OpenAI Service',
      org: 'Microsoft',
      year: 2023,
      description: '企业级 OpenAI API 云服务',
      url: 'https://azure.microsoft.com/en-us/products/ai-services/openai-service',
      icon: '☁️',
      category: 'Platform',
      role: 'founder',
    },
    {
      name: 'Bing Chat',
      org: 'Microsoft',
      year: 2023,
      description: 'GPT 驱动的搜索引擎',
      url: 'https://www.bing.com/chat',
      icon: '🔍',
      category: 'Platform',
      role: 'founder',
    },
  ],

  // Andrej Karpathy - AI 教育家、Tesla 前 AI 总监
  'Andrej Karpathy': [
    {
      name: 'Tesla Autopilot',
      org: 'Tesla',
      year: 2017,
      description: '端到端神经网络自动驾驶系统',
      url: 'https://www.tesla.com/autopilot',
      icon: '🚗',
      category: 'AI Model',
      role: 'lead',
    },
    {
      name: 'Tesla FSD',
      org: 'Tesla',
      year: 2020,
      description: '全自动驾驶 AI 系统',
      url: 'https://www.tesla.com/support/autopilot',
      icon: '🛞',
      category: 'AI Model',
      role: 'lead',
    },
    {
      name: 'Eureka Labs',
      org: 'Eureka Labs',
      year: 2024,
      description: 'AI 原生教育平台',
      url: 'https://eurekalabs.ai',
      icon: '📚',
      category: 'Platform',
      role: 'founder',
    },
  ],

  // Yann LeCun - Meta Chief AI Scientist
  'Yann LeCun': [
    {
      name: 'PyTorch',
      org: 'Meta AI',
      year: 2016,
      description: '最流行的深度学习框架之一',
      url: 'https://pytorch.org',
      icon: '🔥',
      category: 'Framework',
      stats: { downloads: '100M+' },
      role: 'contributor',
    },
    {
      name: 'Llama 3',
      org: 'Meta AI',
      year: 2024,
      description: '最强开源大语言模型系列',
      url: 'https://llama.meta.com',
      icon: '🦙',
      category: 'AI Model',
      stats: { downloads: '350M+' },
      role: 'contributor',
    },
    {
      name: 'Meta AI',
      org: 'Meta',
      year: 2023,
      description: 'Meta 的 AI 助手产品',
      url: 'https://www.meta.ai',
      icon: '🤖',
      category: 'Platform',
      stats: { users: '400M+' },
      role: 'contributor',
    },
  ],

  // Geoffrey Hinton - AI 教父
  'Geoffrey Hinton': [
    {
      name: 'Backpropagation',
      org: 'Academia',
      year: 1986,
      description: '神经网络反向传播算法，深度学习基础',
      url: 'https://www.nature.com/articles/323533a0',
      icon: '🔙',
      category: 'Framework',
      role: 'co-creator',
    },
    {
      name: 'AlexNet',
      org: 'University of Toronto',
      year: 2012,
      description: '开启深度学习革命的 CNN 架构',
      url: 'https://papers.nips.cc/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html',
      icon: '🖼️',
      category: 'AI Model',
      role: 'contributor',
    },
    {
      name: 'Dropout',
      org: 'University of Toronto',
      year: 2012,
      description: '防止过拟合的正则化技术',
      url: 'https://jmlr.org/papers/v15/srivastava14a.html',
      icon: '💧',
      category: 'Framework',
      role: 'co-creator',
    },
  ],

  // John Schulman - Anthropic
  'John Schulman': [
    {
      name: 'PPO',
      org: 'OpenAI',
      year: 2017,
      description: 'Proximal Policy Optimization，最流行的强化学习算法',
      url: 'https://arxiv.org/abs/1707.06347',
      icon: '🎮',
      category: 'Framework',
      role: 'lead',
    },
    {
      name: 'RLHF',
      org: 'OpenAI',
      year: 2020,
      description: '人类反馈强化学习，ChatGPT 核心技术',
      url: 'https://openai.com/research/learning-from-human-preferences',
      icon: '👥',
      category: 'Framework',
      role: 'co-creator',
    },
    {
      name: 'ChatGPT',
      org: 'OpenAI',
      year: 2022,
      description: '参与 RLHF 核心技术研发',
      url: 'https://chat.openai.com',
      icon: '💬',
      category: 'Platform',
      role: 'contributor',
    },
    {
      name: 'Claude',
      org: 'Anthropic',
      year: 2023,
      description: '参与 Anthropic AI 助手研发',
      url: 'https://claude.ai',
      icon: '🤖',
      category: 'Platform',
      role: 'contributor',
    },
  ],

  // Quoc Le - Google DeepMind
  'Quoc Le': [
    {
      name: 'AutoML',
      org: 'Google',
      year: 2017,
      description: '神经架构搜索，自动化模型设计',
      url: 'https://cloud.google.com/automl',
      icon: '🔧',
      category: 'Platform',
      role: 'lead',
    },
    {
      name: 'Seq2Seq',
      org: 'Google',
      year: 2014,
      description: '序列到序列模型，机器翻译突破',
      url: 'https://arxiv.org/abs/1409.3215',
      icon: '🔄',
      category: 'Framework',
      role: 'co-creator',
    },
    {
      name: 'EfficientNet',
      org: 'Google',
      year: 2019,
      description: '高效 CNN 架构系列',
      url: 'https://arxiv.org/abs/1905.11946',
      icon: '📊',
      category: 'AI Model',
      role: 'lead',
    },
    {
      name: 'Gemini',
      org: 'Google DeepMind',
      year: 2023,
      description: '参与 Gemini 多模态模型研发',
      url: 'https://gemini.google.com',
      icon: '♊',
      category: 'AI Model',
      role: 'contributor',
    },
  ],

  // Lukasz Kaiser - Google → OpenAI
  'Lukasz Kaiser': [
    {
      name: 'Transformer',
      org: 'Google',
      year: 2017,
      description: 'Attention is All You Need，现代 AI 基础架构',
      url: 'https://arxiv.org/abs/1706.03762',
      icon: '🔄',
      category: 'Framework',
      role: 'co-creator',
    },
    {
      name: 'Tensor2Tensor',
      org: 'Google',
      year: 2018,
      description: '深度学习模型库和训练框架',
      url: 'https://github.com/tensorflow/tensor2tensor',
      icon: '📦',
      category: 'Framework',
      role: 'lead',
    },
    {
      name: 'GPT-4',
      org: 'OpenAI',
      year: 2023,
      description: '参与 GPT-4 研发',
      url: 'https://openai.com/gpt-4',
      icon: '🧠',
      category: 'AI Model',
      role: 'contributor',
    },
  ],

  // Jeremy Howard - fast.ai
  'Jeremy Howard': [
    {
      name: 'fastai',
      org: 'fast.ai',
      year: 2017,
      description: '简化深度学习的高级 API 库',
      url: 'https://www.fast.ai',
      icon: '⚡',
      category: 'Framework',
      stats: { downloads: '10M+' },
      role: 'founder',
    },
    {
      name: 'ULMFiT',
      org: 'fast.ai',
      year: 2018,
      description: '迁移学习在 NLP 的突破性应用',
      url: 'https://arxiv.org/abs/1801.06146',
      icon: '📚',
      category: 'Framework',
      role: 'co-creator',
    },
    {
      name: 'Practical Deep Learning',
      org: 'fast.ai',
      year: 2018,
      description: '免费深度学习课程，让 AI 平民化',
      url: 'https://course.fast.ai',
      icon: '🎓',
      category: 'Platform',
      stats: { users: '5M+ students' },
      role: 'founder',
    },
  ],

  // Chris Olah - Anthropic
  'Chris Olah': [
    {
      name: 'Distill',
      org: 'Google/Anthropic',
      year: 2016,
      description: '机器学习可解释性研究期刊',
      url: 'https://distill.pub',
      icon: '📰',
      category: 'Platform',
      role: 'founder',
    },
    {
      name: 'Circuits',
      org: 'Anthropic',
      year: 2020,
      description: '神经网络可解释性研究',
      url: 'https://distill.pub/2020/circuits/',
      icon: '🔍',
      category: 'Framework',
      role: 'lead',
    },
    {
      name: 'Claude',
      org: 'Anthropic',
      year: 2023,
      description: '参与 Claude 模型安全和对齐研究',
      url: 'https://claude.ai',
      icon: '🤖',
      category: 'Platform',
      role: 'contributor',
    },
  ],

  // Yoshua Bengio - Mila
  'Yoshua Bengio': [
    {
      name: 'Theano',
      org: 'Mila',
      year: 2007,
      description: '早期深度学习框架，影响了 TensorFlow 和 PyTorch',
      url: 'https://github.com/Theano/Theano',
      icon: '🔢',
      category: 'Framework',
      role: 'contributor',
    },
    {
      name: 'GAN',
      org: 'Mila',
      year: 2014,
      description: '生成对抗网络，革命性的生成模型架构',
      url: 'https://arxiv.org/abs/1406.2661',
      icon: '🎨',
      category: 'Framework',
      role: 'contributor',
    },
    {
      name: 'Attention Mechanism',
      org: 'Mila',
      year: 2014,
      description: '注意力机制，Transformer 的核心基础',
      url: 'https://arxiv.org/abs/1409.0473',
      icon: '👁️',
      category: 'Framework',
      role: 'co-creator',
    },
  ],

  // Jason Wei - OpenAI
  'Jason Wei': [
    {
      name: 'Chain-of-Thought',
      org: 'Google',
      year: 2022,
      description: '思维链提示技术，提升 LLM 推理能力',
      url: 'https://arxiv.org/abs/2201.11903',
      icon: '🔗',
      category: 'Framework',
      role: 'lead',
    },
    {
      name: 'FLAN',
      org: 'Google',
      year: 2021,
      description: '指令微调方法，提升模型零样本能力',
      url: 'https://arxiv.org/abs/2109.01652',
      icon: '📋',
      category: 'Framework',
      role: 'lead',
    },
    {
      name: 'GPT-4o',
      org: 'OpenAI',
      year: 2024,
      description: '参与 OpenAI 多模态模型研发',
      url: 'https://openai.com/gpt-4o',
      icon: '🧠',
      category: 'AI Model',
      role: 'contributor',
    },
  ],

  // Christopher Manning - Stanford
  'Christopher Manning': [
    {
      name: 'Stanford CoreNLP',
      org: 'Stanford',
      year: 2010,
      description: 'Java NLP 工具包，工业级 NLP 标准',
      url: 'https://stanfordnlp.github.io/CoreNLP/',
      icon: '📝',
      category: 'Tool',
      stats: { downloads: '10M+' },
      role: 'lead',
    },
    {
      name: 'GloVe',
      org: 'Stanford',
      year: 2014,
      description: '词向量模型，与 Word2Vec 并列经典',
      url: 'https://nlp.stanford.edu/projects/glove/',
      icon: '📊',
      category: 'AI Model',
      role: 'lead',
    },
    {
      name: 'Stanza',
      org: 'Stanford',
      year: 2020,
      description: 'Python NLP 工具包，支持 60+ 语言',
      url: 'https://stanfordnlp.github.io/stanza/',
      icon: '🐍',
      category: 'Tool',
      role: 'lead',
    },
  ],

  // Wojciech Zaremba - OpenAI
  'Wojciech Zaremba': [
    {
      name: 'GPT-4',
      org: 'OpenAI',
      year: 2023,
      description: '参与 GPT-4 研发',
      url: 'https://openai.com/gpt-4',
      icon: '🧠',
      category: 'AI Model',
      role: 'contributor',
    },
    {
      name: 'Codex',
      org: 'OpenAI',
      year: 2021,
      description: 'AI 编程模型，驱动 GitHub Copilot',
      url: 'https://openai.com/blog/openai-codex',
      icon: '💻',
      category: 'AI Model',
      role: 'lead',
    },
    {
      name: 'OpenAI Robotics',
      org: 'OpenAI',
      year: 2018,
      description: '机器人学习研究，Dactyl 项目',
      url: 'https://openai.com/research/learning-dexterity',
      icon: '🤖',
      category: 'Platform',
      role: 'lead',
    },
  ],

  // Percy Liang - Stanford
  'Percy Liang': [
    {
      name: 'HELM',
      org: 'Stanford',
      year: 2022,
      description: 'Holistic Evaluation of Language Models，LLM 标准化评测框架',
      url: 'https://crfm.stanford.edu/helm/',
      icon: '📊',
      category: 'Platform',
      role: 'lead',
    },
    {
      name: 'Together AI',
      org: 'Together AI',
      year: 2022,
      description: '开源 AI 模型云平台',
      url: 'https://www.together.ai',
      icon: '🤝',
      category: 'Platform',
      role: 'founder',
    },
    {
      name: 'Stanford Alpaca',
      org: 'Stanford',
      year: 2023,
      description: '指令微调 LLaMA 开源项目',
      url: 'https://crfm.stanford.edu/2023/03/13/alpaca.html',
      icon: '🦙',
      category: 'AI Model',
      role: 'lead',
    },
  ],
};

async function enrichProductsManual() {
  console.log('开始手动填充产品数据...\n');

  let updatedCount = 0;
  let skippedCount = 0;

  for (const [personName, products] of Object.entries(MANUAL_PRODUCTS)) {
    // 查找人物
    const person = await prisma.people.findFirst({
      where: {
        OR: [
          { name: personName },
          { aliases: { has: personName } },
        ],
      },
      select: { id: true, name: true, products: true },
    });

    if (!person) {
      console.log(`⚠️ 未找到人物: ${personName}`);
      skippedCount++;
      continue;
    }

    // 获取现有产品（如果有的话）
    const existingProducts = (person.products as Product[] | null) || [];

    // 过滤掉 GitHub 类型的产品，保留手动产品
    const nonGithubProducts = existingProducts.filter(
      p => (p as any).type !== 'github' && !(p.url && p.url.includes('github.com'))
    );

    // 合并新产品（去重）
    const existingNames = new Set(nonGithubProducts.map(p => p.name.toLowerCase()));
    const newProducts = products.filter(p => !existingNames.has(p.name.toLowerCase()));

    const mergedProducts = [...nonGithubProducts, ...newProducts];

    // 更新数据库
    await prisma.people.update({
      where: { id: person.id },
      data: { products: mergedProducts as any },
    });

    console.log(`✅ ${person.name}: 添加 ${newProducts.length} 个产品，共 ${mergedProducts.length} 个`);
    updatedCount++;
  }

  console.log(`\n完成! 更新了 ${updatedCount} 人，跳过 ${skippedCount} 人`);
}

enrichProductsManual()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
