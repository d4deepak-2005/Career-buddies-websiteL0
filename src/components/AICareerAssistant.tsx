import React, { useState } from 'react';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

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

export function AICareerAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hi! I’m the CareerBuddies AI Career Assistant. Tell me about your career goal, experience, interview preparation, or mentorship requirement.',
    },
  ]);

  // =====================================================
  // SEND MESSAGE TO CAREERBUDDIES AI
  // =====================================================

  const sendMessage = async () => {
    const message = input.trim();

    if (!message || isLoading) {
      return;
    }

    setInput('');
    setIsLoading(true);

    // Add user message and empty assistant message
    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        content: message,
      },
      {
        role: 'assistant',
        content: '',
      },
    ]);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          message,
        }),
      });

      // Try to read JSON response
      const data = await response.json();

      console.log('[AI Assistant] Response:', data);

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error ||
            data?.details?.detail ||
            'AI request failed'
        );
      }

      // Backend returns:
      // {
      //   success: true,
      //   answer: "...",
      //   model: "..."
      // }

      const answer =
        typeof data?.answer === 'string'
          ? data.answer.trim()
          : '';

      if (!answer) {
        throw new Error(
          'AI returned an empty response'
        );
      }

      // Update the last assistant message
      setMessages((prev) => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;

        if (
          updated[lastIndex]?.role === 'assistant'
        ) {
          updated[lastIndex] = {
            ...updated[lastIndex],
            content: answer,
          };
        }

        return updated;
      });
    } catch (error) {
      console.error(
        '[AI Assistant]',
        error
      );

      setMessages((prev) => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;

        if (
          updated[lastIndex]?.role === 'assistant'
        ) {
          updated[lastIndex] = {
            ...updated[lastIndex],
            content:
              'Sorry, I’m unable to connect right now. Please try again in a moment.',
          };
        }

        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void sendMessage();
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open CareerBuddies AI Career Assistant"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[#061b3b] px-5 py-3 text-sm font-semibold text-white shadow-xl transition hover:scale-[1.02] hover:bg-[#0b2b5c]"
        >
          <span className="text-lg">
            ✦
          </span>

          AI Career Assistant
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[min(680px,calc(100vh-48px))] w-[min(430px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          
          {/* HEADER */}
          <div className="flex items-center justify-between bg-[#061b3b] px-4 py-4 text-white">
            <div>
              <div className="text-base font-bold">
                CareerBuddies AI
              </div>

              <div className="text-xs text-slate-200">
                AI Career Assistant
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close AI Career Assistant"
              className="rounded-lg px-2 py-1 text-xl leading-none text-white/80 hover:bg-white/10 hover:text-white"
            >
              ×
            </button>
          </div>

          {/* CHAT AREA */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.map(
              (message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${
                    message.role === 'user'
                      ? 'justify-end'
                      : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                      message.role === 'user'
                        ? 'rounded-br-md bg-[#0b2b5c] text-white'
                        : 'rounded-bl-md border border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {message.role ===
                    'assistant'
                      ? renderMarkdown(
                          message.content
                        )
                      : message.content}
                  </div>
                </div>
              )
            )}

            {/* LOADING MESSAGE */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                  Generating answer...
                </div>
              </div>
            )}
          </div>

          {/* INPUT AREA */}
          <div className="border-t border-slate-200 bg-white p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                onKeyDown={handleKeyDown}
                placeholder="Ask about your career..."
                disabled={isLoading}
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-[#0b2b5c] focus:ring-2 focus:ring-[#0b2b5c]/10 disabled:bg-slate-100"
              />

              <button
                type="button"
                onClick={() =>
                  void sendMessage()
                }
                disabled={
                  isLoading ||
                  !input.trim()
                }
                className="rounded-xl bg-[#061b3b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0b2b5c] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading
                  ? '...'
                  : 'Send'}
              </button>
            </div>

            <div className="mt-2 text-center text-[10px] text-slate-400">
              AI-generated guidance. Verify important career decisions.
            </div>
          </div>
        </div>
      )}
    </>
  );
}