-- Adicionar colunas de configuração para relatórios automáticos em admin_settings
ALTER TABLE admin_settings 
ADD COLUMN IF NOT EXISTS daily_report_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS weekly_report_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS monthly_report_enabled BOOLEAN DEFAULT false;