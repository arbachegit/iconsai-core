/**
 * Centralized Tag type definitions
 * Single source of truth for all tag-related interfaces
 */

export interface Tag {
  id: string;
  tag_name: string;
  tag_type: string;
  confidence: number | null;
  source: string | null;
  document_id: string;
  parent_tag_id: string | null;
  created_at: string | null;
  target_chat?: string;
  synonyms?: string[] | null;
}

export interface OrphanedTag {
  id: string;
  tag_name: string;
  parent_tag_id: string;
  document_id: string;
}

export interface DuplicateGroup {
  name: string;
  count: number;
  tags: Tag[];
}

export interface SemanticDuplicate {
  tag1: Tag;
  tag2: Tag;
  similarity: number;
}

export interface SimilarChildPair {
  parentTag: Tag;
  child1: Tag;
  child2: Tag;
  similarity: number;
}

export interface TagFormData {
  tag_name: string;
  tag_type: string;
  confidence: number;
  source: string;
  document_id: string;
  parent_tag_id: string;
  target_chat: string;
  synonyms: string;
}

export const DEFAULT_TAG_FORM_DATA: TagFormData = {
  tag_name: '',
  tag_type: 'parent',
  confidence: 100,
  source: 'manual',
  document_id: '',
  parent_tag_id: '',
  target_chat: 'both',
  synonyms: ''
};
