import React, { Component, ComponentType, LazyExoticComponent, ReactNode, lazy } from 'react';

// Code-splitting helpers. Screens and dialogs that are not needed for the first paint are
// loaded on demand; the app keeps its existing state-based navigation.

function loadWithRetry<T>(factory: () => Promise<T>): Promise<T> {
  // One quick retry covers a transient network blip while a chunk downloads.
  return factory().catch(
    () => new Promise<T>((resolve, reject) => setTimeout(() => factory().then(resolve, reject), 400))
  );
}

export function lazyNamed<T extends Record<K, ComponentType<any>>, K extends keyof T & string>(
  factory: () => Promise<T>,
  name: K
): LazyExoticComponent<T[K]> {
  return lazy(() => loadWithRetry(factory).then((mod) => ({ default: mod[name] })));
}

// Shown in place of a screen while its chunk loads. Same minimum height as the loading states
// already used elsewhere so the footer does not jump around.
export const ScreenFallback: React.FC = () => (
  <div role="status" aria-live="polite" className="min-h-[60vh] w-full flex items-center justify-center">
    <span className="text-sm font-semibold text-[#434652]">Loading…</span>
  </div>
);

// Small centred indicator for dialogs that are still loading.
export const ModalFallback: React.FC = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" role="status" aria-live="polite">
    <span className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#061b3b] shadow-lg">Loading…</span>
  </div>
);

// Renders its children only while `open` is true, so a lazy dialog is not even requested
// until someone opens it.
export const WhenOpen: React.FC<{ open: boolean; children: ReactNode }> = ({ open, children }) =>
  open ? <>{children}</> : null;

interface BoundaryState {
  failed: boolean;
}

// Handles a chunk that could not be downloaded (e.g. offline, or a new version was deployed).
export class LazyBoundary extends Component<{ children: ReactNode; compact?: boolean }, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error('[Lazy load failed]', error?.message);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className={`${this.props.compact ? 'fixed bottom-4 left-4 z-50' : 'min-h-[40vh]'} flex items-center justify-center p-4`}>
        <div className="max-w-sm rounded-2xl border border-[#cbdaff] bg-white p-5 text-center shadow-lg">
          <p className="text-sm font-bold text-[#061b3b]">This section could not be loaded.</p>
          <p className="mt-1 text-xs text-[#434652]">Please check your connection and try again.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 rounded-xl bg-[#002869] px-4 py-2 text-xs font-black text-white cursor-pointer"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
