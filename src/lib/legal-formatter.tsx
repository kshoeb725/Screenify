import React from "react";

export function renderLegalContent(text: string) {
  if (!text) return null;
  
  const lines = text.split("\n");
  const renderedElements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let inList = false;

  const parseBold = (str: string) => {
    const parts = str.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, idx) => {
      if (idx % 2 === 1) {
        return <strong key={idx} className="font-bold text-foreground">{part}</strong>;
      }
      return part;
    });
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      inList = true;
      const content = trimmed.substring(2);
      listItems.push(
        <li key={lineIdx} className="ml-5 list-disc pl-1 mb-2 text-muted-foreground">
          {parseBold(content)}
        </li>
      );
    } else {
      if (inList && listItems.length > 0) {
        renderedElements.push(
          <ul key={`list-${lineIdx}`} className="space-y-1 my-3">
            {[...listItems]}
          </ul>
        );
        listItems = [];
        inList = false;
      }
      if (trimmed) {
        renderedElements.push(
          <p key={lineIdx} className="mb-4 text-muted-foreground">
            {parseBold(line)}
          </p>
        );
      }
    }
  });

  if (listItems.length > 0) {
    renderedElements.push(
      <ul key="list-end" className="space-y-1 my-3">
        {listItems}
      </ul>
    );
  }

  return <div className="space-y-1">{renderedElements}</div>;
}
