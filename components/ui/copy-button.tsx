'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Small icon button that copies `text` to the clipboard with a "copied" flash. */
export function CopyIconButton({
  text,
  title = 'Copy',
}: {
  text: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant="ghost"
      size="xs"
      title={copied ? 'Copied!' : title}
      className={copied ? 'text-neon-300' : undefined}
      onClick={() => {
        void navigator.clipboard?.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </Button>
  );
}
