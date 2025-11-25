-- Create conversation_history table to store chat conversations
CREATE TABLE IF NOT EXISTS public.conversation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversation_history ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can insert their own conversations
CREATE POLICY "Anyone can insert conversations"
  ON public.conversation_history
  FOR INSERT
  WITH CHECK (true);

-- Policy: Everyone can read all conversations (public chat history)
CREATE POLICY "Everyone can read conversations"
  ON public.conversation_history
  FOR SELECT
  USING (true);

-- Policy: Everyone can update their own conversations
CREATE POLICY "Anyone can update conversations"
  ON public.conversation_history
  FOR UPDATE
  USING (true);

-- Policy: Everyone can delete conversations
CREATE POLICY "Anyone can delete conversations"
  ON public.conversation_history
  FOR DELETE
  USING (true);

-- Create index for faster session lookups
CREATE INDEX IF NOT EXISTS idx_conversation_session_id ON public.conversation_history(session_id);

-- Create index for sorting by date
CREATE INDEX IF NOT EXISTS idx_conversation_created_at ON public.conversation_history(created_at DESC);