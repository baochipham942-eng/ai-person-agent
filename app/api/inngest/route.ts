import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { functions } from '@/lib/inngest/functions';

/**
 * Inngest API Route
 * 用于接收 Inngest 的 webhook 调用
 */
export const { GET, POST, PUT } = serve({
    client: inngest,
    functions,
});
