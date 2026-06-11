import React from 'react';
import { createPortal } from 'react-dom';

export function DropdownPortal({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body);
}
