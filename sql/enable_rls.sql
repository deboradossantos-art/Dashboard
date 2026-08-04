-- Habilita RLS (Row Level Security) em todas as tabelas usadas pelo dashboard
-- e restringe leitura/escrita a usuários autenticados (logados via Google,
-- pelo PasswordGate/Supabase Auth). Sem isso, qualquer pessoa com a anon key
-- (pública, embutida no bundle JS) consegue ler/escrever nas tabelas direto
-- pela API REST do Supabase, sem passar pelo login do dashboard.
--
-- Rode isso no Supabase: Table Editor > SQL Editor > cole e execute.
-- Não quebra o app: o dashboard já autentica via supabase.auth.signInWithOAuth
-- (Google), então toda chamada feita pela UI carrega uma sessão válida e
-- passa em auth.role() = 'authenticated'.
--
-- Isso NÃO filtra por email/domínio permitido (isso é feito no cliente pelo
-- VITE_ALLOWED_EMAILS/VITE_ALLOWED_EMAIL_DOMAIN) — só exige uma sessão
-- Supabase válida. Qualquer email que conseguir logar via Google OAuth no
-- projeto Supabase passa nessa policy. Se quiser reforçar por email, dá pra
-- trocar a condição por algo como:
--   auth.role() = 'authenticated' and auth.jwt() ->> 'email' in ('a@x.org', 'b@x.org')

alter table strategic_kpi_reports enable row level security;
alter table channel_modality_reports enable row level security;
alter table donor_status_reports enable row level security;
alter table donor_funnel_reports enable row level security;
alter table audit_log enable row level security;
alter table chatter_reports enable row level security;
alter table financial_reports enable row level security;
alter table employee_reports enable row level security;
alter table desfalque_reports enable row level security;
alter table monthly_reports enable row level security;
alter table employee_vacations enable row level security;
alter table dashboard_overrides enable row level security;
-- dashboard_employee_overrides fica de fora: é uma tabela opcional (o app
-- cai pra localStorage se ela não existir) e não foi criada nesta instância.

create policy "Authenticated read/write" on strategic_kpi_reports
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated read/write" on channel_modality_reports
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated read/write" on donor_status_reports
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated read/write" on donor_funnel_reports
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated read/write" on audit_log
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated read/write" on chatter_reports
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated read/write" on financial_reports
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated read/write" on employee_reports
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated read/write" on desfalque_reports
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated read/write" on monthly_reports
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated read/write" on employee_vacations
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated read/write" on dashboard_overrides
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
