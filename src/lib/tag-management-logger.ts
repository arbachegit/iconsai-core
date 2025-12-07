import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface TagState {
  id: string;
  name: string;
  type: 'parent' | 'child';
  parent_id?: string | null;
  parent_name?: string | null;
  children?: Array<{ id: string; name: string }>;
}

export interface TagManagementEventInput {
  input_state: {
    tags_involved: TagState[];
    similarity_score?: number;
    detection_type?: 'exact' | 'semantic' | 'child_similarity';
  };
  action_type: 
    | 'merge_parent' 
    | 'merge_child' 
    | 'reassign_orphan' 
    | 'reject_duplicate' 
    | 'adopt_orphan'
    | 'delete_orphan'
    | 'export_taxonomy'
    | 'import_taxonomy';
  user_decision: {
    target_tag_id?: string;
    target_tag_name?: string;
    target_parent_id?: string;
    target_parent_name?: string;
    moved_children?: string[];
    orphaned_children?: string[];
    source_tags_removed?: string[];
    imported_count?: number;
    exported_count?: number;
    action?: string;
    format?: string;
  };
  rationale?: string;
  similarity_score?: number;
  time_to_decision_ms?: number;
  session_id?: string;
}

export async function logTagManagementEvent(event: TagManagementEventInput): Promise<void> {
  try {
    const { error } = await supabase
      .from("tag_management_events")
      .insert([{
        input_state: JSON.parse(JSON.stringify(event.input_state)) as Json,
        action_type: event.action_type,
        user_decision: JSON.parse(JSON.stringify(event.user_decision)) as Json,
        rationale: event.rationale || null,
        similarity_score: event.similarity_score || null,
        time_to_decision_ms: event.time_to_decision_ms || null,
        session_id: event.session_id || `session_${Date.now()}`,
        created_by: "admin"
      }]);
    
    if (error) {
      console.error("[TAG_MANAGEMENT_LOG] Error logging event:", error);
    } else {
      console.log("[TAG_MANAGEMENT_LOG] Event logged successfully:", event.action_type);
    }
  } catch (err) {
    console.error("[TAG_MANAGEMENT_LOG] Exception:", err);
  }
}

export function generateSessionId(): string {
  return `tag_session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export function calculateTimeSinceModalOpen(startTime: number): number {
  return Date.now() - startTime;
}
