'use client';

import { type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';

interface ExternalClickableCardProps {
  /** 整卡点击要打开的外部链接 */
  href: string;
  /** 无障碍标签 */
  ariaLabel: string;
  className?: string;
  children: ReactNode;
}

function isPlainLeftClick(event: MouseEvent<HTMLElement>) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/** 卡片内部的链接/按钮自行处理点击，不触发整卡跳转。 */
function shouldIgnore(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('a, button, input, select, textarea, [role="button"]'));
}

/**
 * 整卡可点（打开外部链接）。
 * 解决「卡片主体点了没反应、必须点指定位置」——卡片任意空白处都能跳转，
 * 同时内部嵌套链接（如讲师页）仍独立工作，且不产生非法的 <a> 套 <a>。
 */
export function ExternalClickableCard({ href, ariaLabel, className, children }: ExternalClickableCardProps) {
  const open = () => window.open(href, '_blank', 'noopener,noreferrer');

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (event.defaultPrevented || !isPlainLeftClick(event) || shouldIgnore(event.target)) return;
    open();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented || event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    open();
  };

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={className}
    >
      {children}
    </div>
  );
}
