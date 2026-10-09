import React from 'react';

export function HomeHtmlBlock({ html }: { html: string }) {
  return (
    <div
      className="cb-home-html w-full"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
