'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ProjectWithFaqs } from '@/types/database';

const MAX_QUERY_LENGTH = 500;
const TRUNCATE_NOTICE = `Query truncated to ${MAX_QUERY_LENGTH} characters.`;

interface AiSearchProps {
  onResults: (projects: ProjectWithFaqs[], query: string) => void;
  onClear: () => void;
  className?: string;
  placeholder?: string;
}

interface AiSearchResponse {
  data: {
    projects: ProjectWithFaqs[];
    query: string;
  };
}

export default function AiSearch({
  onResults,
  onClear,
  className,
  placeholder = 'Search projects… e.g. restaurant with online booking',
}: AiSearchProps) {
  const [query, setQuery] = useState<string>('');
  const [truncated, setTruncated] = useState<boolean>(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchMutation = useMutation<AiSearchResponse, Error, string>({
    mutationFn: async (q: string) => {
      const res = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Search failed' }));
        throw new Error((err as { error?: string }).error ?? 'Search failed');
      }

      return res.json() as Promise<AiSearchResponse>;
    },
    onSuccess: (data) => {
      onResults(data.data.projects, data.data.query);
    },
  });

  // Clear debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;
      let wasTruncated = false;

      if (value.length > MAX_QUERY_LENGTH) {
        value = value.slice(0, MAX_QUERY_LENGTH);
        wasTruncated = true;
      }

      setQuery(value);
      setTruncated(wasTruncated);

      // If field is emptied, call onClear after debounce
      if (value.trim() === '') {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          onClear();
          searchMutation.reset();
        }, 300);
      }
    },
    [onClear, searchMutation]
  );

  const handleSubmit = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();

    if (!trimmed) {
      onClear();
      searchMutation.reset();
      return;
    }

    searchMutation.mutate(trimmed);
  }, [query, onClear, searchMutation]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    setTruncated(false);
    searchMutation.reset();
    onClear();
    inputRef.current?.focus();
  }, [onClear, searchMutation]);

  const isLoading = searchMutation.isPending;
  const hasError = searchMutation.isError;

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      <div className="relative flex items-center gap-2">
        {/* Search icon — left side of input */}
        <div className="pointer-events-none absolute left-3 flex items-center text-muted">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </div>

        <Input
          ref={inputRef}
          type="search"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          maxLength={MAX_QUERY_LENGTH}
          aria-label="AI project search"
          className={cn(
            'pl-9 pr-20 h-11',
            hasError && 'border-destructive focus-visible:ring-destructive'
          )}
        />

        {/* Clear button — shown when there is a query */}
        {query.length > 0 && !isLoading && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute right-[4.5rem] flex items-center text-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
          size="sm"
          className="absolute right-1.5 h-8 px-3 text-xs"
          aria-label="Run search"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            'Search'
          )}
        </Button>
      </div>

      {/* Status messages */}
      {truncated && (
        <p className="text-xs text-muted pl-1">{TRUNCATE_NOTICE}</p>
      )}

      {hasError && (
        <p className="text-xs text-destructive pl-1" role="alert">
          {searchMutation.error?.message ?? 'Search failed. Please try again.'}
        </p>
      )}
    </div>
  );
}