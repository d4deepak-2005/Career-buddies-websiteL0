import React from 'react';

// Keyboard support for clickable non-button elements: Enter / Space activate them,
// exactly like a click. Spread onto the element: {...buttonProps(handler)}.
export function buttonProps(handler: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick: handler,
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handler();
      }
    },
  };
}
