"use client";

import { useMemo } from "react";
import DOMPurify from "dompurify";

interface BlogPostContentProps {
  content: string;
}

export default function BlogPostContent({ content }: BlogPostContentProps) {
  const sanitizedContent = useMemo(() => {
    if (typeof window === "undefined") return "";

    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [
        "p",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "ul",
        "ol",
        "li",
        "strong",
        "em",
        "a",
        "blockquote",
        "code",
        "pre",
        "img",
        "br",
        "hr",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
      ],
      ALLOWED_ATTR: ["href", "src", "alt", "class", "target", "rel"],
      ALLOW_DATA_ATTR: false,
      FORCE_BODY: false,
    });
  }, [content]);

  if (!content) return null;

  return (
    <div
      className="prose-platform max-w-none"
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
}