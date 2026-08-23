import { supabase } from '@/utils/supabase';

type Json = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

/**
 * Append an entry to public.audit_log. Never throws - audit failures should
 * not break user-facing flows; they log to the console instead.
 */
export async function logAuditEvent(input: {
  action: string;
  resourceType: string;
  resourceId?: string | null;
  beforeState?: Json;
  afterState?: Json;
  details?: Json;
}): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('audit_log').insert({
      user_id: user.id,
      action: input.action,
      resource_type: input.resourceType,
      resource_id: input.resourceId ?? null,
      before_state: input.beforeState ?? null,
      after_state: input.afterState ?? null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      details: input.details ?? null,
    });
    if (error) throw error;
  } catch (err) {
    console.warn('[audit] failed to log event', input.action, err);
  }
}
