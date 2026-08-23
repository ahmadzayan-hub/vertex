import { useCallback, useState } from 'react';

import { supabase } from '@/utils/supabase';
import { logAuditEvent } from '@/services/audit';

interface State {
  submitting: boolean;
  error: string | null;
  send: (submissionId: string, text: string) => Promise<boolean>;
  toggleResolved: (commentId: string, resolved: boolean) => Promise<boolean>;
}

export function useComments(onChange: () => void | Promise<void>): State {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (submissionId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return false;
      setSubmitting(true);
      setError(null);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        setSubmitting(false);
        return false;
      }
      const { error: insErr } = await supabase.from('comments').insert({
        submission_id: submissionId,
        user_id: user.id,
        comment_text: trimmed,
      });
      setSubmitting(false);
      if (insErr) {
        setError(insErr.message);
        return false;
      }
      await logAuditEvent({
        action: 'comment.added',
        resourceType: 'submission',
        resourceId: submissionId,
      });
      await onChange();
      return true;
    },
    [onChange]
  );

  const toggleResolved = useCallback(
    async (commentId: string, resolved: boolean) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error: updErr } = await supabase
        .from('comments')
        .update({
          resolved,
          resolved_at: resolved ? new Date().toISOString() : null,
          resolved_by: resolved ? user?.id ?? null : null,
        })
        .eq('id', commentId);
      if (updErr) {
        setError(updErr.message);
        return false;
      }
      await onChange();
      return true;
    },
    [onChange]
  );

  return { submitting, error, send, toggleResolved };
}
