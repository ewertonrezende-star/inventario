# Inventário Coopsintra

Aplicação de inventário multi-loja com interface React/TanStack, leitura por código de barras, importação da base Primavera e consolidação por armazém.

## Repositório oficial

- Repositório: https://github.com/ewertonrezende-star/inventario
- Branch de produção: `main`
- Publicação: https://ewertonrezende-star.github.io/inventario/

Foi criada uma cópia de segurança antes da adaptação: `backup/pre-adaptacao-2026-11-23`.

## Funcionalidades

- Contagem por loja com leitura de códigos de barras e pesquisa manual por código de artigo/descrição.
- Modo rápido: cada leitura adiciona uma unidade.
- Sincronização das contagens através do Supabase.
- Consolidação por artigo e loja, com opção de apagar a contagem de um artigo.
- Importação do Excel Primavera com as colunas `cod barras`, `Artigo`, `Descrição`, `Stock Atual`, `Últ. Preço de Compra (Artigo)` e `Armazém`.
- O stock é associado à combinação artigo + sigla do armazém. Stock negativo é guardado como veio do Primavera, mas apresentado como zero no Consolidado.

## Base de dados Supabase

Projeto utilizado: `uacadlvvonvriiqdxdfr`.

Tabelas utilizadas:
- `inv_artigos`
- `inv_codigos_barras`
- `inv_inventarios`
- `inv_contagens`
- `inv_perfis`
- `inv_stock_lojas` (nova tabela para o stock separado por armazém)

### Preparar a tabela de stock

Antes da primeira importação Primavera, executar uma única vez no SQL Editor do Supabase o ficheiro:

`supabase/migrations/202611230001_stock_lojas.sql`

A política de escrita exige um utilizador ativo com perfil `central`. As lojas podem consultar o stock do respetivo armazém de acordo com a função `inv_pode_aceder_loja`.

A importação atualiza os artigos, associações de códigos de barras e stocks por combinação artigo/armazém. Não apaga contagens nem inventários. Stocks negativos e zeros são preservados na base.

## Executar localmente

Requisitos: Bun (recomendado) ou Node.js 20+.

```bash
git clone https://github.com/ewertonrezende-star/inventario.git
cd inventario
bun install
bun run dev
```

Para desenvolvimento local, definir `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no ambiente ou num ficheiro `.env`.

## Testes e build

```bash
bun run test
bun run build
```

## Publicação

O projeto usa TanStack Start em modo SPA para permitir alojamento estático no GitHub Pages. O workflow em `.github/workflows/deploy.yml`:
1. instala as dependências;
2. executa os testes;
3. constrói o shell SPA com base `/inventario/`;
4. publica os ficheiros estáticos no GitHub Pages.

A chave `sb_publishable` é uma chave pública destinada ao browser. A segurança dos dados depende das políticas RLS do Supabase. Nunca colocar uma chave `service_role` em código cliente, em variáveis `VITE_*` ou no GitHub.

## Histórico de branches

- `backup/pre-adaptacao-2026-11-23`: estado de `main` antes desta adaptação.
- `backup/antes-coopersintra-stock`: versão HTML anterior da contagem e esquema SQL inicial.
- `backup/main-antes-copia-lovable-2026-11-23`: continha apenas um redirecionamento para o endereço publicado no Lovable.
- `migracao/coopersintra-stock`: versão intermédia da migração; o seu código foi comparado com `main`.
