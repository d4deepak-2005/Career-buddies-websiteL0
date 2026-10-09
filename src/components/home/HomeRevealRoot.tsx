import React, { useLayoutEffect, useRef } from 'react';

function contentInner(section: HTMLElement): HTMLElement | null {
  const labeled = section.querySelector<HTMLElement>(':scope > .relative.z-10, :scope > [data-home-section]');
  if (labeled) return labeled;
  const kids = Array.from(section.children).filter((el): el is HTMLElement => {
    if (!(el instanceof HTMLElement)) return false;
    return !el.classList.contains('absolute') && !el.classList.contains('pointer-events-none');
  });
  return kids[0] || null;
}

function collectTargets(root: HTMLElement): HTMLElement[] {
  const seen = new Set<HTMLElement>();
  const add = (el: HTMLElement | null) => {
    if (!el || seen.has(el)) return;
    seen.add(el);
  };

  root.querySelectorAll<HTMLElement>('[data-home-reveal]').forEach(add);

  root.querySelectorAll<HTMLElement>('.home-stagger').forEach((grid) => {
    Array.from(grid.children).forEach((child) => {
      if (child instanceof HTMLElement) add(child);
    });
  });

  root.querySelectorAll<HTMLElement>('section, footer').forEach((section) => {
    const inner = contentInner(section);
    if (!inner) {
      add(section);
      return;
    }
    if (section.querySelector('[data-home-reveal], .home-stagger')) {
      Array.from(inner.children).forEach((child) => {
        if (!(child instanceof HTMLElement)) return;
        if (child.classList.contains('home-stagger')) return;
        if (child.hasAttribute('data-home-reveal')) return;
        add(child);
      });
      return;
    }
    add(inner);
  });

  return [...seen];
}

function isInView(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  return rect.top < window.innerHeight * 0.92 && rect.bottom > 40;
}

export function HomeRevealRoot({
  children,
  className = 'home-page-reveal flex flex-col w-full bg-white',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const prepared = new WeakSet<HTMLElement>();
    let io: IntersectionObserver;

    const reveal = (el: HTMLElement) => {
      if (el.classList.contains('is-in')) return;
      el.classList.add('is-in');
      io.unobserve(el);
      const finish = (event: TransitionEvent) => {
        if (event.propertyName !== 'opacity' && event.propertyName !== 'transform') return;
        el.classList.remove('home-reveal', 'is-in');
        el.style.removeProperty('--home-reveal-delay');
        el.removeEventListener('transitionend', finish);
      };
      el.addEventListener('transitionend', finish);
      window.setTimeout(() => {
        if (!el.classList.contains('home-reveal')) return;
        el.classList.remove('home-reveal', 'is-in');
        el.style.removeProperty('--home-reveal-delay');
        el.removeEventListener('transitionend', finish);
      }, 1200);
    };

    io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) return;
          reveal(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );

    const prepare = (el: HTMLElement) => {
      if (prepared.has(el)) return;
      prepared.add(el);
      el.classList.add('home-reveal');
      const parent = el.parentElement;
      if (parent?.classList.contains('home-stagger')) {
        const idx = Array.from(parent.children).indexOf(el);
        el.style.setProperty('--home-reveal-delay', `${Math.min(idx, 7) * 70}ms`);
      }
      io.observe(el);
      if (isInView(el)) {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            if (el.classList.contains('home-reveal') && !el.classList.contains('is-in') && isInView(el)) {
              reveal(el);
            }
          });
        });
      }
    };

    const scan = () => {
      collectTargets(root).forEach(prepare);
    };

    scan();

    const mo = new MutationObserver(() => scan());
    mo.observe(root, { childList: true, subtree: true });

    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        collectTargets(root).forEach((el) => {
          if (el.classList.contains('home-reveal') && !el.classList.contains('is-in') && isInView(el)) {
            reveal(el);
          }
        });
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      mo.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
