import React from 'react';
import { Lock } from 'lucide-react';

interface CopyrightedToolNoticeProps {
  toolName: string;
  toolFullName: string;
}

export const CopyrightedToolNotice: React.FC<CopyrightedToolNoticeProps> = ({
  toolName,
  toolFullName,
}) => (
  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm">
    <Lock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
    <p className="text-amber-800">
      <span className="font-semibold">{toolName}</span> — The{' '}
      <span className="font-medium">{toolFullName}</span> is a copyrighted
      assessment tool. Watch the case study video and complete the paper form by
      hand, then transcribe your subscale scores into the fields below.
    </p>
  </div>
);
