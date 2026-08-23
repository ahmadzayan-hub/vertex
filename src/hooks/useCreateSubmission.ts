import { useCallback, useState } from 'react';

import { supabase } from '@/utils/supabase';
import type { SubmissionType, Submission } from '@/types';
import { uploadSubmissionFile, validateFile, MAX_FILE_BYTES } from '@/services/storage';
import { logAuditEvent } from '@/services/audit';

interface Args {
  projectId: string;
  submissionType: SubmissionType;
  documentName?: string;
  file: File;
}

interface State {
  submitting: boolean;
  error: string | null;
  create: (args: Args) => Promise<Submission | null>;
}

export function useCreateSubmission(): State {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (args: Args): Promise<Submission | null> => {
    setSubmitting(true);
    setError(null);
    try {
      const validation = validateFile(args.file);
      if (!validation.ok) {
        throw new Error(
          validation.reason === 'size'
            ? `File exceeds ${MAX_FILE_BYTES / 1024 / 1024} MB`
            : 'File type not supported'
        );
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Insert submission row (pending), get its id.
      const { data: sub, error: insErr } = await supabase
        .from('submissions')
        .insert({
          project_id: args.projectId,
          submission_type: args.submissionType,
          document_name: args.documentName || args.file.name,
          file_url: '',
          file_size_bytes: args.file.size,
          uploaded_by: user.id,
          processing_status: 'pending',
        })
        .select('*')
        .single();
      if (insErr) throw insErr;

      // 2. Upload file into storage under <project_id>/<submission_id>/<name>.
      const path = await uploadSubmissionFile(args.projectId, sub.id, args.file);

      // 3. Update the submission row with the storage path.
      const { data: updated, error: updErr } = await supabase
        .from('submissions')
        .update({ file_url: path })
        .eq('id', sub.id)
        .select('*')
        .single();
      if (updErr) throw updErr;

      await logAuditEvent({
        action: 'submission.uploaded',
        resourceType: 'submission',
        resourceId: sub.id,
        afterState: {
          project_id: args.projectId,
          submission_type: args.submissionType,
          file_size_bytes: args.file.size,
        },
      });

      return updated as Submission;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'upload failed');
      return null;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submitting, error, create };
}
