import { useMemo } from "react";
import { calculateSimilarity } from "@/lib/string-similarity";
import type { Tag } from "@/types/tag";

export interface OrphanedTag {
  id: string;
  tag_name: string;
  tag_type: string;
  confidence: number | null;
  source: string | null;
  document_id: string;
  parent_tag_id: string | null;
  created_at: string;
}

export interface DuplicateGroup {
  tag_name: string;
  count: number;
  ids: string[];
}

export interface SemanticDuplicate {
  tag1: string;
  tag2: string;
  similarity: number;
  ids: string[];
}

export interface SimilarChildPair {
  tag1: string;
  tag2: string;
  id1: string;
  id2: string;
  similarity: number;
}

export interface SimilarChildGroup {
  parentId: string;
  parentName: string;
  pairs: SimilarChildPair[];
}

export function useSimilarityCalculations(
  allTags: Tag[] | undefined,
  parentTags: Tag[],
  childTagsMap: Record<string, Tag[]>
) {
  // Detect exact duplicates - memoized
  const duplicateParentTags = useMemo(() => {
    if (!parentTags.length) return [];
    
    return parentTags.reduce((acc, tag) => {
      const existing = acc.find((item) => item.tag_name === tag.tag_name);
      if (existing) {
        existing.count += 1;
        existing.ids.push(tag.id);
      } else {
        acc.push({ tag_name: tag.tag_name, count: 1, ids: [tag.id] });
      }
      return acc;
    }, [] as DuplicateGroup[]).filter((item) => item.count > 1);
  }, [parentTags]);

  // Detect semantic duplicates - memoized with O(n²) calculation
  const semanticDuplicates = useMemo(() => {
    if (!parentTags.length) return [];
    
    const results: SemanticDuplicate[] = [];
    const uniqueTagNames = [...new Set(parentTags.map(t => t.tag_name))];
    
    // Limit to first 100 unique tags for performance
    const limitedTags = uniqueTagNames.slice(0, 100);
    
    for (let i = 0; i < limitedTags.length; i++) {
      for (let j = i + 1; j < limitedTags.length; j++) {
        const similarityPct = calculateSimilarity(limitedTags[i], limitedTags[j]);
        const similarity = similarityPct / 100; // Convert from 0-100 to 0-1
        // Consider similar if >= 70% match but not exact
        if (similarity >= 0.7 && similarity < 1) {
          const tag1Ids = parentTags.filter(t => t.tag_name === limitedTags[i]).map(t => t.id);
          const tag2Ids = parentTags.filter(t => t.tag_name === limitedTags[j]).map(t => t.id);
          results.push({
            tag1: limitedTags[i],
            tag2: limitedTags[j],
            similarity,
            ids: [...tag1Ids, ...tag2Ids],
          });
        }
      }
    }
    
    return results.sort((a, b) => b.similarity - a.similarity);
  }, [parentTags]);

  // Detect similar child tags within the same parent - memoized
  const similarChildTagsPerParent = useMemo(() => {
    if (!parentTags.length) return [];
    
    const results: SimilarChildGroup[] = [];
    
    // Limit to first 50 parents for performance
    const limitedParents = parentTags.slice(0, 50);
    
    limitedParents.forEach(parent => {
      const children = childTagsMap[parent.id] || [];
      if (children.length < 2 || children.length > 50) return; // Skip if too few or too many
      
      const pairs: SimilarChildPair[] = [];
      
      for (let i = 0; i < children.length; i++) {
        for (let j = i + 1; j < children.length; j++) {
          const similarityPct = calculateSimilarity(children[i].tag_name, children[j].tag_name);
          const similarity = similarityPct / 100; // Convert from 0-100 to 0-1
          // Consider similar if >= 60% match but not exact
          if (similarity >= 0.6 && similarity < 1) {
            pairs.push({
              tag1: children[i].tag_name,
              tag2: children[j].tag_name,
              id1: children[i].id,
              id2: children[j].id,
              similarity,
            });
          }
        }
      }
      
      if (pairs.length > 0) {
        pairs.sort((a, b) => b.similarity - a.similarity);
        results.push({
          parentId: parent.id,
          parentName: parent.tag_name,
          pairs: pairs.slice(0, 10), // Limit pairs per parent
        });
      }
    });
    
    return results;
  }, [parentTags, childTagsMap]);

  // Total count of child duplicates
  const totalChildDuplicates = useMemo(() => {
    return similarChildTagsPerParent.reduce((sum, p) => sum + p.pairs.length, 0);
  }, [similarChildTagsPerParent]);

  // Detect orphaned child tags
  const orphanedTags = useMemo((): OrphanedTag[] => {
    if (!allTags) return [];
    
    return allTags
      .filter(tag => {
        if (!tag.parent_tag_id) return false;
        const parentExists = parentTags.some(p => p.id === tag.parent_tag_id);
        return !parentExists && tag.created_at; // Ensure created_at exists
      })
      .map(tag => ({
        id: tag.id,
        tag_name: tag.tag_name,
        tag_type: tag.tag_type,
        confidence: tag.confidence,
        source: tag.source,
        document_id: tag.document_id,
        parent_tag_id: tag.parent_tag_id,
        created_at: tag.created_at || new Date().toISOString(),
      }));
  }, [allTags, parentTags]);

  return {
    duplicateParentTags,
    semanticDuplicates,
    similarChildTagsPerParent,
    totalChildDuplicates,
    orphanedTags,
  };
}
