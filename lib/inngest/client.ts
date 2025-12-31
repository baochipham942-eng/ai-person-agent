import { Inngest } from 'inngest';

/**
 * Inngest 客户端
 * 用于任务调度和后台处理
 */
export const inngest = new Inngest({
    id: 'ai-person-agent',
    // 开发环境下使用本地 Inngest Dev Server
    // 生产环境 Inngest 会自动使用云服务
});

/**
 * 事件类型定义
 */
export type PersonCreatedEvent = {
    name: 'person/created';
    data: {
        personId: string;
        personName: string;
        englishName?: string;
        qid: string;
        orcid?: string;  // ORCID for academic verification
        officialLinks: {
            type: string;
            url: string;
            handle?: string;
        }[];
        aliases: string[];
    };
};

export type Events = {
    'person/created': PersonCreatedEvent;
};
