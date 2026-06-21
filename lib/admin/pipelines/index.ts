import './person';
import './content/company-blogs';
import './content/youtube-captions';
import './content/threads-link';
import './content/openalex-papers';
import './content/courses';

/** 确保所有 pipeline 已注册（import 副作用）。在执行器/路由入口调用一次。 */
export function ensurePipelinesRegistered(): void {
  // 仅触发上面的 import 副作用；空函数体即可。
}
