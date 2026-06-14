import { runDueMaintenanceSchedules, runMaintenanceJob } from '@/lib/admin/maintenance';
import { inngest } from './client';

export const maintenanceJobRunner = inngest.createFunction(
  {
    id: 'run-maintenance-job',
    retries: 0,
    concurrency: {
      limit: 1,
    },
    triggers: [{ event: 'maintenance/job.requested' }],
  },
  async ({ event, step }) => {
    return step.run('run-maintenance-job', async () => {
      await runMaintenanceJob(event.data.jobId);
      return { jobId: event.data.jobId };
    });
  },
);

export const maintenanceScheduleScanner = inngest.createFunction(
  {
    id: 'scan-maintenance-schedules',
    retries: 0,
    concurrency: {
      limit: 1,
    },
    triggers: [{ cron: '*/30 * * * *' }],
  },
  async ({ step }) => {
    return step.run('scan-maintenance-schedules', async () => runDueMaintenanceSchedules());
  },
);
