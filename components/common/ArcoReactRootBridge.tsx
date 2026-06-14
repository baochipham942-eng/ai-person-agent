'use client';

import { createRoot } from 'react-dom/client';
import { setCreateRoot } from '@arco-design/web-react/es/_util/react-dom';

let isConfigured = false;

export function ArcoReactRootBridge() {
  if (!isConfigured) {
    setCreateRoot(createRoot);
    isConfigured = true;
  }

  return null;
}
