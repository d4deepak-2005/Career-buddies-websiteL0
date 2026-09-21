import React, { useEffect, useRef } from 'react';

// Drop this component as the FIRST child of a modal's overlay/dialog element. It gives
// that element proper dialog semantics and behaviour without changing any visuals:
//   - role="dialog", aria-modal and an accessible name (aria-label)
//   - keyboard focus moves into the dialog on open and returns to the opener on close
//   - Escape closes it (only the topmost open dialog reacts)
//   - Tab / Shift+Tab stay inside a modal dialog
//   - the page behind cannot scroll while a modal dialog is open
// Pass modal={false} for a non-modal floating panel (no scroll lock / focus containment).

const openDialogs: HTMLElement[] = [];
let scrollLocks = 0;
let previousOverflow = '';
let previousPaddingRight = '';

function lockScroll() {
  if (scrollLocks === 0) {
    const body = document.body;
    previousOverflow = body.style.overflow;
    previousPaddingRight = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
  }
  scrollLocks += 1;
}

function unlockScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) {
    document.body.style.overflow = previousOverflow;
    document.body.style.paddingRight = previousPaddingRight;
  }
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function focusableIn(el: HTMLElement): HTMLElement[] {
  return Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (node) => node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden'
  );
}

interface ModalA11yProps {
  label: string;
  onClose: () => void;
  modal?: boolean;
}

export const ModalA11y: React.FC<ModalA11yProps> = ({ label, onClose, modal = true }) => {
  const marker = useRef<HTMLSpanElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Name can change while open (e.g. Login -> Sign up); this never moves focus.
  useEffect(() => {
    marker.current?.parentElement?.setAttribute('aria-label', label);
  }, [label]);

  useEffect(() => {
    const el = marker.current?.parentElement;
    if (!el) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', modal ? 'true' : 'false');
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.style.outline = 'none';

    openDialogs.push(el);
    if (modal) lockScroll();
    el.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (openDialogs[openDialogs.length - 1] !== el) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }

      if (modal && event.key === 'Tab') {
        const items = focusableIn(el);
        if (items.length === 0) {
          event.preventDefault();
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && (active === first || active === el)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        } else if (!el.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    // Scrollable areas inside the dialog must be reachable by keyboard so their content can be scrolled.
    const makeScrollAreasFocusable = () => {
      el.querySelectorAll<HTMLElement>('*').forEach((node) => {
        if (node.hasAttribute('tabindex') || node === el) return;
        const overflowY = getComputedStyle(node).overflowY;
        if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
          node.setAttribute('tabindex', '0');
        }
      });
    };
    makeScrollAreasFocusable();
    const scrollTimer = window.setTimeout(makeScrollAreasFocusable, 400);

    // Form semantics for the forms inside this dialog: fields marked "*" are aria-required, and a red
    // validation message under a field is tied to it (aria-describedby / aria-invalid) and announced.
    let errorSeq = 0;
    const syncFormSemantics = () => {
      el.querySelectorAll<HTMLLabelElement>('label[for]').forEach((label) => {
        if (!label.textContent?.includes('*')) return;
        const control = el.querySelector<HTMLElement>(`[id="${label.htmlFor}"]`);
        if (control && !control.hasAttribute('aria-required')) control.setAttribute('aria-required', 'true');
      });
      const described = new Set<HTMLElement>();
      el.querySelectorAll<HTMLElement>('p[class*="text-red-"], span[class*="text-red-"]').forEach((message) => {
        // Skip the red "*" required markers inside labels; only real messages are linked.
        if (message.closest('label') || (message.textContent?.trim().length ?? 0) < 3) return;
        const control = message.parentElement?.querySelector<HTMLElement>('input,select,textarea');
        if (!control || !message.textContent?.trim()) return;
        if (!message.id) message.id = `modal-error-${++errorSeq}-${Math.random().toString(36).slice(2, 7)}`;
        message.setAttribute('role', 'alert');
        control.setAttribute('aria-describedby', message.id);
        control.setAttribute('aria-invalid', 'true');
        control.setAttribute('data-a11y-error', '');
        described.add(control);
      });
      el.querySelectorAll<HTMLElement>('[data-a11y-error]').forEach((control) => {
        if (described.has(control)) return;
        control.removeAttribute('aria-describedby');
        control.removeAttribute('aria-invalid');
        control.removeAttribute('data-a11y-error');
      });
    };
    syncFormSemantics();
    const observer = new MutationObserver(syncFormSemantics);
    observer.observe(el, { childList: true, subtree: true });

    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(scrollTimer);
      observer.disconnect();
      document.removeEventListener('keydown', onKeyDown);
      const index = openDialogs.indexOf(el);
      if (index >= 0) openDialogs.splice(index, 1);
      if (modal) unlockScroll();
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [modal]);

  return <span ref={marker} hidden aria-hidden="true" />;
};
