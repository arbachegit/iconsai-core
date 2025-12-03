-- Fix search_documents RPC function to include inserted_in_chat filter
-- This allows documents with target_chat='general' but inserted_in_chat='study' to be found when searching for 'study'

CREATE OR REPLACE FUNCTION public.search_documents(query_embedding vector, target_chat_filter text DEFAULT NULL::text, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 5)
 RETURNS TABLE(chunk_id uuid, document_id uuid, content text, similarity double precision, metadata jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id AS chunk_id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    dc.metadata
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE d.status = 'completed'
    AND d.is_readable = true
    AND (target_chat_filter IS NULL 
         OR d.target_chat = target_chat_filter 
         OR d.inserted_in_chat = target_chat_filter)
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$;

-- Also fix search_documents_keywords for consistency
CREATE OR REPLACE FUNCTION public.search_documents_keywords(keywords text[], target_chat_filter text DEFAULT NULL::text, match_count integer DEFAULT 5)
 RETURNS TABLE(chunk_id uuid, document_id uuid, content text, similarity double precision, metadata jsonb, matched_keyword text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id AS chunk_id,
    dc.document_id,
    dc.content,
    0.5::double precision AS similarity,
    dc.metadata,
    kw AS matched_keyword
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  CROSS JOIN LATERAL unnest(keywords) AS kw
  WHERE d.status = 'completed'
    AND d.is_readable = true
    AND (target_chat_filter IS NULL 
         OR d.target_chat = target_chat_filter 
         OR d.inserted_in_chat = target_chat_filter)
    AND dc.content ILIKE '%' || kw || '%'
  GROUP BY dc.id, dc.document_id, dc.content, dc.metadata, kw
  ORDER BY length(kw) DESC
  LIMIT match_count;
END;
$function$;

-- Also fix search_documents_fulltext for consistency
CREATE OR REPLACE FUNCTION public.search_documents_fulltext(search_query text, target_chat_filter text DEFAULT NULL::text, match_count integer DEFAULT 5)
 RETURNS TABLE(chunk_id uuid, document_id uuid, content text, similarity double precision, metadata jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id AS chunk_id,
    dc.document_id,
    dc.content,
    0.5::double precision AS similarity,
    dc.metadata
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE d.status = 'completed'
    AND d.is_readable = true
    AND (target_chat_filter IS NULL 
         OR d.target_chat = target_chat_filter 
         OR d.inserted_in_chat = target_chat_filter)
    AND dc.content ILIKE '%' || search_query || '%'
  ORDER BY dc.chunk_index
  LIMIT match_count;
END;
$function$;