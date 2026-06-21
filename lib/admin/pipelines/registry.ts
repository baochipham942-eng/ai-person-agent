import type { MaintenancePipeline } from './types';

const registry = new Map<string, MaintenancePipeline>();

export function registerPipeline(pipeline: MaintenancePipeline): void {
  if (registry.has(pipeline.kind)) {
    throw new Error(`管线已注册: ${pipeline.kind}`);
  }
  registry.set(pipeline.kind, pipeline);
}

export function getPipeline(kind: string): MaintenancePipeline | undefined {
  return registry.get(kind);
}

export function listPipelines(): MaintenancePipeline[] {
  return [...registry.values()];
}

/** 仅供测试重置注册表。 */
export function resetRegistry(): void {
  registry.clear();
}
