#!/usr/bin/env python3
"""
Script para criar tabela password_reset_tokens no Supabase
Execute: python scripts/create_password_reset_table.py
"""

import os
from supabase import create_client, Client

# Configurações do Supabase
SUPABASE_URL = "https://eefoiubkvyykalsbcoci.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_SERVICE_ROLE_KEY:
    print("❌ SUPABASE_SERVICE_ROLE_KEY não encontrada nas variáveis de ambiente")
    print("Execute: export SUPABASE_SERVICE_ROLE_KEY='sua-chave-aqui'")
    exit(1)

# Criar cliente Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# SQL para criar a tabela
SQL_CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  verification_code TEXT,
  pending_password TEXT,
  step TEXT DEFAULT 'awaiting_password',
  code_attempts INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  code_expires_at TIMESTAMPTZ,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
"""

SQL_CREATE_INDEXES = """
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON public.password_reset_tokens(email);
"""

SQL_ENABLE_RLS = """
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
"""

SQL_CREATE_POLICY = """
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'password_reset_tokens'
        AND policyname = 'Service role only'
    ) THEN
        CREATE POLICY "Service role only" ON public.password_reset_tokens
          FOR ALL
          USING (auth.role() = 'service_role');
    END IF;
END
$$;
"""

def main():
    print("🚀 Criando tabela password_reset_tokens...")

    try:
        # Executar SQL via RPC (função postgres)
        # Como não temos uma função RPC, vamos usar a API REST diretamente

        import requests

        headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }

        # Usar a API REST do PostgREST não permite DDL diretamente
        # Precisamos usar o endpoint de SQL do Management API

        # Alternativa: usar psycopg2 com connection string
        print("📝 Tentando via psycopg2...")

        try:
            import psycopg2

            # Connection string do Supabase (pooler)
            # Formato: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
            DATABASE_URL = os.environ.get("DATABASE_URL")

            if not DATABASE_URL:
                print("❌ DATABASE_URL não encontrada")
                print("Execute: export DATABASE_URL='postgresql://postgres.eefoiubkvyykalsbcoci:SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres'")
                print("\n📋 Ou execute manualmente no Supabase Dashboard > SQL Editor:")
                print_manual_sql()
                exit(1)

            conn = psycopg2.connect(DATABASE_URL)
            conn.autocommit = True
            cur = conn.cursor()

            print("✅ Conectado ao banco de dados")

            # Criar tabela
            print("📦 Criando tabela...")
            cur.execute(SQL_CREATE_TABLE)
            print("✅ Tabela criada")

            # Criar índices
            print("📦 Criando índices...")
            cur.execute(SQL_CREATE_INDEXES)
            print("✅ Índices criados")

            # Habilitar RLS
            print("🔒 Habilitando RLS...")
            cur.execute(SQL_ENABLE_RLS)
            print("✅ RLS habilitado")

            # Criar política
            print("📜 Criando política...")
            cur.execute(SQL_CREATE_POLICY)
            print("✅ Política criada")

            cur.close()
            conn.close()

            print("\n🎉 Tabela password_reset_tokens criada com sucesso!")

        except ImportError:
            print("❌ psycopg2 não instalado")
            print("Execute: pip install psycopg2-binary")
            print("\n📋 Ou execute manualmente no Supabase Dashboard > SQL Editor:")
            print_manual_sql()

    except Exception as e:
        print(f"❌ Erro: {e}")
        print("\n📋 Execute manualmente no Supabase Dashboard > SQL Editor:")
        print_manual_sql()

def print_manual_sql():
    sql = """
-- Cole este SQL no Supabase Dashboard > SQL Editor:

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  verification_code TEXT,
  pending_password TEXT,
  step TEXT DEFAULT 'awaiting_password',
  code_attempts INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  code_expires_at TIMESTAMPTZ,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON public.password_reset_tokens(email);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.password_reset_tokens
  FOR ALL
  USING (auth.role() = 'service_role');
"""
    print(sql)

if __name__ == "__main__":
    main()
