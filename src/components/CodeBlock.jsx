import React from 'react';
import { Copy, CheckCircle } from 'lucide-react';
import { useToast } from './Toast';

export default function CodeBlock({ code, lang = 'json' }) {
  const toast = useToast();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative mt-2 rounded-md overflow-hidden border border-gray-border bg-gray-bg">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-border bg-gray-bg">
        <span className="text-xs text-muted font-mono font-medium">
          {lang}
        </span>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-main rounded transition-colors"
          aria-label={`Copy ${lang} code`}
        >
          {copied ? (
            <>
              <CheckCircle size={14} className="text-success" />
              <span className="text-success">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="m-0 p-4 bg-[var(--white)] text-main font-mono text-xs overflow-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
