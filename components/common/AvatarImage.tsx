'use client';

import { useState } from 'react';

interface AvatarImageProps {
  /** 头像地址，可能为空或失效（unavatar / twimg 死链） */
  src: string | null | undefined;
  /** 人物姓名，用于生成首字母兜底和 alt */
  name: string;
  /** 图片元素的 className（一般为 h-full w-full object-cover 等） */
  className?: string;
  /** 兜底首字母容器的 className */
  fallbackClassName?: string;
}

/**
 * 带 onError 兜底的头像图。
 * 裸 <img> 在 URL 失效时会显示浏览器裂图；这里加载失败后自动回退到首字母，
 * 全站统一替换，根治「头像裂开」问题。
 */
export function AvatarImage({ src, name, className = 'h-full w-full object-cover', fallbackClassName }: AvatarImageProps) {
  const [failed, setFailed] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  if (!src || failed) {
    return (
      <span className={fallbackClassName ?? 'flex h-full w-full items-center justify-center text-sm font-semibold text-stone-500'}>
        {initial}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      loading="lazy"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
