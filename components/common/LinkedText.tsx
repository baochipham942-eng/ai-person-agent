'use client';

import Link from 'next/link';

interface LinkedTextProps {
  text: string;
  className?: string;
}

/**
 * 解析并渲染包含人物链接标记的文本
 * 标记语法: [[显示名称|personId]]
 * 例如: "作为 [[Geoffrey Hinton|clxxx123]] 的学生..."
 */
export function LinkedText({ text, className }: LinkedTextProps) {
  if (!text) return null;

  // 正则匹配 [[name|id]] 格式
  const linkPattern = /\[\[([^\]|]+)\|([^\]]+)\]\]/g;

  // 检查是否有链接标记
  if (!linkPattern.test(text)) {
    // 无标记，直接返回文本
    return <span className={className}>{text}</span>;
  }

  // 重置正则状态
  linkPattern.lastIndex = 0;

  const parts: Array<{ type: 'text' | 'link'; content: string; id?: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = linkPattern.exec(text)) !== null) {
    // 添加链接前的普通文本
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    // 添加链接
    parts.push({
      type: 'link',
      content: match[1], // 显示名称
      id: match[2],      // personId
    });

    lastIndex = match.index + match[0].length;
  }

  // 添加最后的普通文本
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === 'link' && part.id) {
          return (
            <Link
              key={index}
              href={`/person/${part.id}`}
              className="text-orange-600 hover:text-orange-700 hover:underline font-medium"
            >
              {part.content}
            </Link>
          );
        }
        return <span key={index}>{part.content}</span>;
      })}
    </span>
  );
}
