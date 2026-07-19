CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  shop_id uuid NOT NULL,
  title text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT chat_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT chat_sessions_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  session_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view chat sessions of their shop"
  ON public.chat_sessions
  FOR SELECT
  USING (shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create chat sessions for their shop"
  ON public.chat_sessions
  FOR INSERT
  WITH CHECK (shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their chat sessions"
  ON public.chat_sessions
  FOR UPDATE
  USING (shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete their chat sessions"
  ON public.chat_sessions
  FOR DELETE
  USING (shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Messages Policies
CREATE POLICY "Users can view chat messages of their shop"
  ON public.chat_messages
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM public.chat_sessions WHERE shop_id IN (
        SELECT shop_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create chat messages for their shop"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM public.chat_sessions WHERE shop_id IN (
        SELECT shop_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );
