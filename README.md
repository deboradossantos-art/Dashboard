# Painel de Operação e Arrecadação

Dashboard de acompanhamento de doadores e arrecadação: funil de ativação,
status de doadores (ativos/churn), métodos de pagamento por canal de origem
e KPIs operacionais — com importação manual (planilha/formulário) ou
sincronização automática a partir de uma planilha do Google Sheets.

Este é o dashboard real usado pelo setor de Relacionamento da Ser Feliz,
publicado aqui como código aberto (licença MIT) — tanto pra outros setores
da própria organização quanto pra qualquer pessoa/organização que queira
adaptar pra sua própria operação de arrecadação/relacionamento com doadores.

**Cada instância é independente**: quem for usar faz um fork e sobe sua
própria instância (Supabase, Vercel e planilha próprios) — isso não é uma
instalação multi-tenant compartilhada, e nenhuma instância deve reaproveitar
credenciais ou lista de acesso de outra.

## Stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui + Recharts
- Supabase (Postgres + Auth) como backend
- Deploy na Vercel (com função serverless opcional para sync com Google Sheets)

## Checklist rápido pra replicar num novo setor

- [ ] Fork do repositório (não reaproveitar o mesmo repo entre setores)
- [ ] Projeto novo no Supabase: criar as 5 tabelas (SQL abaixo) + habilitar login com Google no Auth
- [ ] Projeto novo na Vercel apontando pro fork
- [ ] `VITE_ALLOWED_EMAILS` ou `VITE_ALLOWED_EMAIL_DOMAIN` com os emails do setor
- [ ] `VITE_ADMIN_EMAIL` do setor
- [ ] Decidir o que fazer com a Edge Function `send-notification` (ver seção própria — não vem no repo)
- [ ] Revisar `src/data/strategicData.ts` (taxonomias podem não fazer sentido pro setor)
- [ ] (opcional) Planilha do Google Sheets própria + variáveis de sync

O passo a passo completo de cada item está abaixo.

## Replicando para um novo setor

### 1. Fork/cópia do repositório

Cada setor tem seu próprio repositório (fork ou cópia) — não compartilhe o
mesmo repo entre setores, senão as customizações de um vazam pro outro.

### 2. Supabase — projeto e tabelas

Crie um novo projeto no [Supabase](https://supabase.com) pro setor e rode o
SQL abaixo (Table Editor > SQL Editor) pra criar as tabelas que o dashboard
espera:

```sql
create table strategic_kpi_reports (
  mes text primary key,                    -- "2026-07"
  arrecadacao_ativa numeric,                -- R$ arrecadação ativa total do mês
  doadores_ativos integer,
  doadores_base integer,                    -- ativos + inativos + cancelados
  doadores_cartao_recorrente integer,
  doacoes_identificadas integer,            -- conciliadas/identificadas no período
  doacoes_total integer
);

create table channel_modality_reports (
  id uuid primary key default gen_random_uuid(),
  mes text not null,
  canal text not null,                      -- ver CANAIS_ORIGEM em strategicData.ts
  cartao_credito integer,
  cartao_recorrencia integer,
  boleto integer,
  pix integer,
  unique (mes, canal)
);

create table donor_status_reports (
  mes text primary key,
  pct_ativos numeric,                       -- % da base em status ativo
  pct_inativos numeric,                     -- % sem doar há 1-3 meses (pré-cancelamento)
  pct_cancelados numeric                    -- % cancelados (não quer mais doar OU 5 tentativas sem resposta)
);

create table donor_funnel_reports (
  mes text primary key,
  cadastro_inicial integer,
  contato_realizado integer,
  primeiro_pagamento integer,
  doador_ativo integer                      -- recorrente, último estágio do funil
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  action text not null,
  details text,
  created_at timestamptz not null default now()
);
```

Depois, em Authentication > Providers, habilite o **Google** e configure as
URLs de redirect (a própria tela do Supabase mostra a URL de callback a
cadastrar no Google Cloud Console).

**Sobre RLS (Row Level Security):** por padrão essas tabelas ficam sem RLS
habilitado, ou seja, legíveis/graváveis por qualquer chave anônima válida.
Se isso for uma preocupação pro seu setor, habilite RLS e crie policies
específicas antes de colocar dados reais em produção — o dashboard atual não
depende de RLS estar desligado, só foi construído assumindo acesso simples
via anon key.

### 3. Vercel próprio

Novo projeto na Vercel apontando pro fork do setor, com suas próprias
Environment Variables (veja `.env.example` e a seção "Deploy na Vercel"
abaixo).

### 4. Controle de acesso do setor

Configure, no `.env` do setor:

- `VITE_ALLOWED_EMAILS` — lista explícita de emails autorizados, separados
  por vírgula. Tem prioridade se estiver definida.
- `VITE_ALLOWED_EMAIL_DOMAIN` — alternativa mais simples: autoriza qualquer
  email de um domínio inteiro (ex.: `setorx.org`).
- `VITE_ADMIN_EMAIL` — email com acesso a áreas administrativas
  (ex.: `/historico`).

**Nunca reaproveite a lista de emails de outro setor** — é o principal
motivo de cada setor precisar do seu próprio fork/deploy, não de uma
instalação compartilhada.

### 5. Edge Function `send-notification` (não vem no repositório)

`src/lib/useAudit.ts` chama, além de gravar em `audit_log`, uma Supabase Edge
Function chamada `send-notification` (via `${VITE_SUPABASE_URL}/functions/v1/send-notification`)
pra mandar um email a cada evento de auditoria. Essa função **vive só no
projeto Supabase da Ser Feliz** — não existe uma pasta `supabase/functions`
neste repositório, então um fork novo não vai ter essa função automaticamente.

Isso **não quebra o dashboard**: a chamada está dentro de um `try/catch` em
`logAudit()`, então se a função não existir, o erro só aparece no console e
o registro em `audit_log` (que é feito antes, numa chamada separada) continua
funcionando normalmente. Ou seja: histórico de acessos funciona, notificação
por email não, até alguém recriar a function no novo projeto Supabase.

Se o setor quiser as notificações por email, é preciso criar a Edge Function
`send-notification` do zero no novo projeto (ela recebe `{ user_email,
action, details }` no corpo do POST e deve enviar o email por algum provedor
— SendGrid, Resend, etc. — não há código de referência dela neste repo).

### 6. Adaptar ao negócio do setor

O modelo de dados atual (canais de origem, modalidades de pagamento, funil
de ativação de doador) é específico de arrecadação/relacionamento com
doadores. Um setor com outro tipo de operação provavelmente vai precisar
editar:

- `src/data/strategicData.ts` — taxonomias (canais, modalidades) e tipos de
  relatório.
- `src/hooks/useDashboardOverview.ts` — lógica de agregação dos dados.
- `src/pages/Index.tsx` e demais páginas — títulos, KPIs e gráficos
  exibidos.
- `src/index.css` / `tailwind.config.ts` — cores do tema, se quiser um
  visual diferente por setor.

### 7. Sincronização com Google Sheets (opcional)

Se o setor for manter os dados numa planilha em vez de só formulário/upload
manual, veja `api/sync-sheets.ts` para a lista completa de variáveis de
ambiente server-side (`SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_SHEET_ID`, gids
das abas, `SYNC_SECRET`) — cada setor usa sua própria planilha e seu próprio
`GOOGLE_SHEET_ID`.

## Como rodar localmente

```sh
git clone <URL_DO_FORK_DO_SEU_SETOR>
cd <NOME_DO_PROJETO>
npm install
cp .env.example .env
# preencha o .env com as credenciais do SEU setor
npm run dev
```

## Variáveis de ambiente

Veja `.env.example` para a lista completa (Supabase, controle de acesso,
sync com Google Sheets). Nenhum email real ou credencial deve ser commitado
no repositório — tudo fica em `.env` local ou nas Environment Variables da
Vercel.

## Licença

MIT — veja [LICENSE](./LICENSE). Uso, cópia, modificação e redistribuição
são livres, contanto que o aviso de copyright e a licença sejam mantidos.

## Deploy na Vercel

Configurações de projeto (também definidas em `vercel.json`, então a Vercel
detecta tudo automaticamente ao importar o repositório):

- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Node.js: 20 a 22 (ver `engines` em `package.json`)

Cadastre as variáveis de ambiente do fork do seu setor em Project Settings >
Environment Variables (client-side `VITE_*` e, se for usar sync com Google
Sheets, as server-side listadas em `api/sync-sheets.ts`).

O `vercel.json` já cuida de duas coisas importantes: redireciona rotas
internas do React Router pra `index.html` (então `/funcionarias`,
`/upload` etc. funcionam mesmo abertas direto ou recarregadas) e agenda o
cron diário de sincronização com o Google Sheets, se configurado.

As páginas principais são carregadas sob demanda (lazy loading), e o
exportador de PDF só carrega sua implementação quando o botão de exportar é
clicado.

## Problemas comuns

**A função `/api/sync-sheets` retorna 404 ou 405.** O diretório `/api`
precisa existir no repositório que está deployado na Vercel — se o arquivo
`api/sync-sheets.ts` não foi commitado (só criado localmente, por exemplo),
a Vercel nem reconhece a rota e cai no fallback de SPA, retornando o 404 do
próprio app em vez de um erro da function.

**Variáveis de ambiente "somem" no Vercel.** Depois de adicionar uma env
var em Project Settings > Environment Variables, confirme salvando a página
e recarregando — em alguns casos o cadastro não persiste na primeira
tentativa. Sempre confira a lista completa depois de adicionar.

**Erro `Headers.set... invalid header value` ao sincronizar.** Normalmente
significa que `SUPABASE_SERVICE_ROLE_KEY` foi cadastrada com o valor errado
(por exemplo, colando um bloco inteiro de `.env` em vez de só a chave).
Confirme que a variável tem *só* o valor da service role key, sem quebras de
linha nem texto extra.

**Login autoriza email que não devia (ou barra email que devia).** Confira
se `VITE_ALLOWED_EMAILS`/`VITE_ALLOWED_EMAIL_DOMAIN` e `VITE_ADMIN_EMAIL`
estão cadastradas no ambiente certo (Vercel Production vs. Preview vs.
Development têm listas separadas) e se o valor bate exatamente com o email
usado no login Google.
