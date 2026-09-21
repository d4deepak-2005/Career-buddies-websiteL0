import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ModalA11y } from './common/ModalA11y';

function renderMarkdown(text: string) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const elements: React.ReactNode[] = [];

  const formatInline = (value: string): React.ReactNode[] => {
    const parts = value.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index}>
            {part.slice(2, -2)}
          </strong>
        );
      }

      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={index}
            className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-800"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      return (
        <React.Fragment key={index}>
          {part}
        </React.Fragment>
      );
    });
  };

  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line) {
      index += 1;
      continue;
    }

    // Markdown table
    if (
      line.includes('|') &&
      index + 1 < lines.length &&
      /^\s*\|?\s*:?-{3,}/.test(lines[index + 1])
    ) {
      const headers = line
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim());

      index += 2;

      const rows: string[][] = [];

      while (
        index < lines.length &&
        lines[index].includes('|')
      ) {
        const row = lines[index]
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((cell) => cell.trim());

        if (row.some(Boolean)) {
          rows.push(row);
        }

        index += 1;
      }

      elements.push(
        <div
          key={`table-${index}`}
          className="my-3 overflow-x-auto rounded-xl border border-slate-200"
        >
          <table className="min-w-full border-collapse text-left text-xs">
            <thead className="bg-slate-100">
              <tr>
                {headers.map((header, headerIndex) => (
                  <th
                    key={headerIndex}
                    className="border-b border-slate-200 px-3 py-2 font-bold text-slate-800"
                  >
                    {formatInline(header)}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="odd:bg-white even:bg-slate-50"
                >
                  {headers.map((_, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="border-b border-slate-100 px-3 py-2 align-top text-slate-700"
                    >
                      {formatInline(row[cellIndex] || '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

      continue;
    }

    // Headings
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);

    if (headingMatch) {
      elements.push(
        <div
          key={`heading-${index}`}
          className="mb-2 mt-3 text-sm font-bold text-[#061b3b]"
        >
          {formatInline(headingMatch[1])}
        </div>
      );

      index += 1;
      continue;
    }

    // Bullet list
    if (/^[-*]\s+/.test(line)) {
      const bullets: string[] = [];

      while (
        index < lines.length &&
        /^[-*]\s+/.test(lines[index].trim())
      ) {
        bullets.push(
          lines[index]
            .trim()
            .replace(/^[-*]\s+/, '')
        );

        index += 1;
      }

      elements.push(
        <ul
          key={`bullets-${index}`}
          className="my-2 list-disc space-y-1 pl-5"
        >
          {bullets.map((bullet, bulletIndex) => (
            <li key={bulletIndex}>
              {formatInline(bullet)}
            </li>
          ))}
        </ul>
      );

      continue;
    }

    // Numbered list
    if (/^\d+[.)]\s+/.test(line)) {
      const numbered: string[] = [];

      while (
        index < lines.length &&
        /^\d+[.)]\s+/.test(lines[index].trim())
      ) {
        numbered.push(
          lines[index]
            .trim()
            .replace(/^\d+[.)]\s+/, '')
        );

        index += 1;
      }

      elements.push(
        <ol
          key={`numbered-${index}`}
          className="my-2 list-decimal space-y-1 pl-5"
        >
          {numbered.map((item, itemIndex) => (
            <li key={itemIndex}>
              {formatInline(item)}
            </li>
          ))}
        </ol>
      );

      continue;
    }

    // Normal paragraph
    elements.push(
      <p
        key={`paragraph-${index}`}
        className="mb-2 last:mb-0"
      >
        {formatInline(line)}
      </p>
    );

    index += 1;
  }

  return elements;
}

type Recommendation = {
  name: string;
  type: 'plan' | 'programme' | 'service';
  factors: string[];
  why: string;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  // assistant only
  status?: 'streaming' | 'done' | 'error';
  errorKind?: 'timeout' | 'failed';
  recommendation?: Recommendation | null;
  showCta?: boolean;
  webinarsAvailable?: boolean;
};

interface AICareerAssistantProps {
  // Existing website destinations (wired in App.tsx): the counselling request flow and the Webinars page.
  onConnectAdvisor?: (interest?: string) => void;
  onRegisterWebinar?: () => void;
}

const GREETING_ID = 'greeting';
const GREETING =
  'Hi! I’m CB AI Assistant. Tell me about your career goal, your experience or the problem you’re facing, and I’ll suggest the most relevant next step.';

const SAMPLE_QUESTIONS = [
  'Which CareerBuddies plan is right for me?',
  'I want to switch my career. How can CareerBuddies help?',
  'How can CareerBuddies help me grow professionally?',
];

const SAMPLES_KEY = 'cb_ai_samples_dismissed';
const ERROR_TEXT = {
  timeout: 'I’m taking longer than expected to process this. Please try again.',
  failed: 'Something went wrong. Please try again.',
};
const TYPE_LABEL: Record<Recommendation['type'], string> = { plan: 'Plan', programme: 'Programme', service: 'Service' };

let messageCounter = 0;
const newId = () => `m${Date.now().toString(36)}${(messageCounter++).toString(36)}`;

const IconMinimize = () => (
  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M3 12h10" />
  </svg>
);
const IconMaximize = () => (
  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="10" height="10" rx="1.5" />
  </svg>
);
const IconRestore = () => (
  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5.5" width="7.5" height="7.5" rx="1.3" />
    <path d="M6 5.5V4.3A1.3 1.3 0 0 1 7.3 3H12a1 1 0 0 1 1 1v4.7a1.3 1.3 0 0 1-1.3 1.3h-1.2" />
  </svg>
);
const IconClose = () => (
  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

const headerButton =
  'flex h-10 w-10 items-center justify-center rounded-lg text-white/85 transition-colors hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:h-9 sm:w-9';

// One chat bubble. Memoised so that streaming into the last message does not re-render the rest of the chat.
const MessageBubble = React.memo(function MessageBubble({
  message,
  onRetry,
  onAdvisor,
  onWebinar,
}: {
  message: ChatMessage;
  onRetry: (id: string) => void;
  onAdvisor: (interest?: string) => void;
  onWebinar: () => void;
}) {
  const isUser = message.role === 'user';
  const rec = message.recommendation;
  const showCta = !isUser && message.status === 'done' && message.showCta;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[92%] break-words rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[88%] ${
          isUser ? 'rounded-br-md bg-[#0b2b5c] text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-700'
        }`}
      >
        {isUser ? (
          message.content
        ) : message.status === 'streaming' && !message.content ? (
          <span className="animate-pulse text-slate-500">Thinking…</span>
        ) : (
          renderMarkdown(message.content)
        )}

        {!isUser && message.status === 'error' && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => onRetry(message.id)}
              className="rounded-lg border border-[#014d59]/40 bg-[#014d59]/5 px-3 py-1.5 text-xs font-semibold text-[#014d59] transition hover:bg-[#014d59]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#014d59]/50"
            >
              Retry
            </button>
          </div>
        )}

        {rec && message.status === 'done' && (
          <div className="mt-3 rounded-xl border border-[#014d59]/25 bg-[#014d59]/5 px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#014d59]">
              Recommended {TYPE_LABEL[rec.type].toLowerCase()}
            </div>
            <div className="text-sm font-bold text-[#061b3b]">{rec.name}</div>
            <details className="group mt-1.5 text-xs text-slate-700">
              <summary className="cursor-pointer select-none font-semibold text-[#014d59] focus:outline-none focus-visible:underline">
                Why this recommendation?
              </summary>
              <div className="mt-1.5 space-y-1.5">
                {rec.factors.length > 0 && (
                  <>
                    <div className="font-semibold text-slate-800">You mentioned:</div>
                    <ul className="list-disc space-y-0.5 pl-5">
                      {rec.factors.map((factor, i) => (
                        <li key={i}>{factor}</li>
                      ))}
                    </ul>
                  </>
                )}
                {rec.why && (
                  <p>
                    Based on this, {rec.name} is relevant because {rec.why.charAt(0).toLowerCase() + rec.why.slice(1).replace(/^because\s+/i, '')}
                  </p>
                )}
              </div>
            </details>
          </div>
        )}

        {showCta && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            {message.webinarsAvailable && (
              <button
                type="button"
                onClick={onWebinar}
                className="min-h-[40px] rounded-xl border border-[#014d59] bg-white px-4 py-2 text-xs font-semibold text-[#014d59] transition hover:bg-[#014d59]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#014d59]/50"
              >
                Register for a Webinar
              </button>
            )}
            <button
              type="button"
              onClick={() => onAdvisor(rec?.name)}
              className="min-h-[40px] rounded-xl bg-gradient-to-r from-[#002256] via-[#014d59] to-[#006226] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#014d59]/60"
            >
              Connect with an Advisor
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export function AICareerAssistant({ onConnectAdvisor, onRegisterWebinar }: AICareerAssistantProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [samplesDismissed, setSamplesDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(SAMPLES_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: GREETING_ID, role: 'assistant', content: GREETING, status: 'done' }]);

  // The launcher button is replaced by the panel while open; put keyboard focus back on it after closing.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !isOpen) document.getElementById('ai-assistant-launcher')?.focus();
    if (isOpen) setHasUnread(false);
    wasOpen.current = isOpen;
  }, [isOpen]);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const stickToBottom = useRef(true);
  const streamBuffer = useRef('');
  const rafId = useRef<number | null>(null);

  const hasUserMessage = messages.some((m) => m.role === 'user');

  // Keep the newest text in view while the reply streams in, unless the visitor scrolled up to read.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, isOpen, isMaximized]);

  useEffect(() => {
    if (isOpen && !isLoading) inputRef.current?.focus({ preventScroll: true });
  }, [isOpen, isLoading]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const patchMessage = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  // =====================================================
  // SEND A MESSAGE (real streaming from /api/ai)
  // =====================================================
  const runRequest = useCallback(
    async (text: string, assistantId: string, history: { role: string; content: string }[]) => {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 100_000);
      let received = '';
      let finished = false;

      const flush = () => {
        rafId.current = null;
        patchMessage(assistantId, { content: received });
      };

      const fail = (kind: 'timeout' | 'failed', message?: string) => {
        if (rafId.current !== null) cancelAnimationFrame(rafId.current);
        rafId.current = null;
        const text = message || ERROR_TEXT[kind];
        // Keep whatever had already arrived, then explain what happened.
        patchMessage(assistantId, {
          status: 'error',
          errorKind: kind,
          content: received ? `${received}\n\n${text}` : text,
        });
        if (!isOpenRef.current) setHasUnread(true);
      };

      try {
        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, history, stream: true }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          let apiMessage: string | undefined;
          let code: string | undefined;
          try {
            const data = await response.json();
            code = data?.code;
            // Only our own rate-limit message is worth showing verbatim; everything else is generic.
            if (response.status === 429 && typeof data?.error === 'string') apiMessage = data.error;
          } catch {
            /* not JSON */
          }
          fail(code === 'timeout' ? 'timeout' : 'failed', apiMessage);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const handleEvent = (event: string, data: any) => {
          if (event === 'delta' && typeof data?.text === 'string') {
            received += data.text;
            if (rafId.current === null) rafId.current = requestAnimationFrame(flush);
          } else if (event === 'done') {
            finished = true;
            if (rafId.current !== null) cancelAnimationFrame(rafId.current);
            rafId.current = null;
            patchMessage(assistantId, {
              status: 'done',
              content: typeof data?.answer === 'string' && data.answer ? data.answer : received,
              recommendation: data?.recommendation || null,
              showCta: !!data?.cta,
              webinarsAvailable: !!data?.webinarsAvailable,
            });
            if (!isOpenRef.current) setHasUnread(true);
          } else if (event === 'error') {
            finished = true;
            fail(data?.code === 'timeout' ? 'timeout' : 'failed');
          }
        };

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let boundary: number;
          while ((boundary = buffer.indexOf('\n\n')) >= 0) {
            const block = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            let event = 'message';
            let dataLine = '';
            for (const line of block.split('\n')) {
              if (line.startsWith('event:')) event = line.slice(6).trim();
              else if (line.startsWith('data:')) dataLine += line.slice(5).trim();
            }
            if (!dataLine) continue;
            try {
              handleEvent(event, JSON.parse(dataLine));
            } catch {
              /* ignore a malformed event */
            }
          }
        }

        if (!finished) fail('failed'); // the stream ended without a final event
      } catch (error: any) {
        fail(error?.name === 'AbortError' ? 'timeout' : 'failed');
      } finally {
        window.clearTimeout(timer);
        setIsLoading(false);
      }
    },
    [patchMessage]
  );

  const historyFrom = (list: ChatMessage[]) =>
    list
      .filter((m) => m.id !== GREETING_ID && m.content.trim() && m.status !== 'error' && m.status !== 'streaming')
      .slice(-24)
      .map((m) => ({ role: m.role, content: m.content }));

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || isLoading) return;
      const history = historyFrom(messagesRef.current);
      const assistantId = newId();
      setInput('');
      setIsLoading(true);
      stickToBottom.current = true;
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: 'user', content: text },
        { id: assistantId, role: 'assistant', content: '', status: 'streaming' },
      ]);
      void runRequest(text, assistantId, history);
    },
    [isLoading, runRequest]
  );

  const retry = useCallback(
    (assistantId: string) => {
      if (isLoading) return;
      const list = messagesRef.current;
      const at = list.findIndex((m) => m.id === assistantId);
      const userMessage = at > 0 ? list[at - 1] : undefined;
      if (!userMessage || userMessage.role !== 'user') return;
      // Replace the failed exchange instead of duplicating the user's message.
      const before = list.slice(0, at - 1);
      const history = historyFrom(before);
      const newAssistantId = newId();
      setIsLoading(true);
      stickToBottom.current = true;
      setMessages([...before, userMessage, { id: newAssistantId, role: 'assistant', content: '', status: 'streaming' }]);
      void runRequest(userMessage.content, newAssistantId, history);
    },
    [isLoading, runRequest]
  );

  const dismissSamples = () => {
    setSamplesDismissed(true);
    try {
      sessionStorage.setItem(SAMPLES_KEY, '1');
    } catch {
      /* storage unavailable: it just stays dismissed until reload */
    }
  };

  // Samples disappear as soon as the conversation starts, whether or not they were dismissed.
  const showSamples = !hasUserMessage && !samplesDismissed;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      send(input);
    }
  };

  const closePanel = () => setIsOpen(false);
  const goAdvisor = useCallback(
    (interest?: string) => {
      setIsOpen(false);
      onConnectAdvisor?.(interest);
    },
    [onConnectAdvisor]
  );
  const goWebinar = useCallback(() => {
    setIsOpen(false);
    onRegisterWebinar?.();
  }, [onRegisterWebinar]);

  const panelSize = isMaximized
    ? 'bottom-0 right-0 h-[100dvh] w-screen rounded-none sm:bottom-6 sm:right-6 sm:h-[calc(100dvh-48px)] sm:w-[min(1000px,calc(100vw-48px))] sm:rounded-2xl'
    : 'bottom-3 right-3 h-[min(680px,calc(100dvh-24px))] w-[calc(100vw-24px)] rounded-2xl sm:bottom-6 sm:right-6 sm:h-[min(680px,calc(100dvh-48px))] sm:w-[min(430px,calc(100vw-48px))]';

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          id="ai-assistant-launcher"
          onClick={() => setIsOpen(true)}
          aria-label={hasUnread ? 'Open CB AI Assistant (new reply)' : 'Open CB AI Assistant'}
          className="ai-launcher fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center gap-2 rounded-full bg-[#061b3b] text-sm font-semibold text-white shadow-lg transition hover:bg-[#0b2b5c] sm:h-auto sm:w-auto sm:px-5 sm:py-3"
        >
          <span className="text-lg">✦</span>
          <span className="hidden sm:inline">CB AI Assistant</span>
          {hasUserMessage && (
            <span
              aria-hidden="true"
              className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#79fd8d] ${hasUnread ? 'animate-pulse' : ''}`}
            />
          )}
        </button>
      )}

      {isOpen && (
        <div
          className={`ai-panel fixed z-50 flex flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl transition-[width,height,border-radius] duration-200 ease-out ${panelSize}`}
        >
          <ModalA11y label="CB AI Assistant" onClose={closePanel} modal={false} />

          {/* HEADER: same blue-to-green direction as the website footer */}
          <div className="flex shrink-0 items-center justify-between gap-2 bg-gradient-to-r from-[#002256] via-[#014d59] to-[#006226] px-4 py-3 text-white">
            <div className="min-w-0">
              <div className="truncate text-base font-bold leading-tight">CB AI Assistant</div>
              <div className="truncate text-xs text-white/80">Your career consultant</div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button type="button" onClick={closePanel} aria-label="Minimize CB AI Assistant" title="Minimize" className={headerButton}>
                <IconMinimize />
              </button>
              <button
                type="button"
                onClick={() => setIsMaximized((v) => !v)}
                aria-label={isMaximized ? 'Restore CB AI Assistant size' : 'Maximize CB AI Assistant'}
                title={isMaximized ? 'Restore' : 'Maximize'}
                className={headerButton}
              >
                {isMaximized ? <IconRestore /> : <IconMaximize />}
              </button>
              <button type="button" onClick={closePanel} aria-label="Close CB AI Assistant" title="Close" className={headerButton}>
                <IconClose />
              </button>
            </div>
          </div>

          {/* CHAT AREA */}
          <div
            ref={scrollRef}
            onScroll={onScroll}
            role="log"
            aria-label="Conversation with CB AI Assistant"
            tabIndex={0}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 p-4"
          >
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} onRetry={retry} onAdvisor={goAdvisor} onWebinar={goWebinar} />
              ))}

              {showSamples && (
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Try asking</span>
                    <button
                      type="button"
                      onClick={dismissSamples}
                      aria-label="Dismiss sample questions"
                      title="Dismiss"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-lg leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#014d59]/50"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {SAMPLE_QUESTIONS.map((question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() => send(question)}
                        disabled={isLoading}
                        className="min-h-[40px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs leading-snug text-slate-700 transition hover:border-[#014d59] hover:text-[#014d59] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#014d59]/50 disabled:opacity-50"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* INPUT AREA */}
          <div className="shrink-0 border-t border-slate-200 bg-white p-3">
            <div className="mx-auto w-full max-w-3xl">
              {hasUserMessage && (
                <div className="flex items-center justify-between pb-2">
                  <button
                    type="button"
                    onClick={() => setMessages([{ id: GREETING_ID, role: 'assistant', content: GREETING, status: 'done' }])}
                    disabled={isLoading}
                    className="text-[11px] font-medium text-slate-500 hover:text-[#014d59] disabled:opacity-50"
                  >
                    Clear chat
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  aria-label="Message to CB AI Assistant"
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your career..."
                  maxLength={1000}
                  enterKeyHint="send"
                  disabled={isLoading}
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-3 text-base outline-none transition focus:border-[#014d59] focus:ring-2 focus:ring-[#014d59]/15 disabled:bg-slate-100 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => send(input)}
                  disabled={isLoading || !input.trim()}
                  className="min-h-[44px] rounded-xl bg-gradient-to-r from-[#002256] via-[#014d59] to-[#006226] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#014d59]/60 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? '...' : 'Send'}
                </button>
              </div>
              <div className="mt-2 text-center text-[11px] text-slate-500">AI-generated guidance. Verify important career decisions.</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
