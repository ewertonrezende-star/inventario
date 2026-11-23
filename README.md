# Inventário Coopsintra

Aplicação própria de inventário multi-loja, mantida diretamente neste repositório.

- Repositório: https://github.com/ewertonrezende-star/inventario
- Branch de produção: `main`
- Publicação: https://ewertonrezende-star.github.io/inventario/

## Funcionalidades atuais

- Autenticação por email/palavra-passe do Supabase e perfil ativo em `inv_perfis`.
- Utilizadores de loja limitados à sua sigla; perfil `central` pode consultar e gerir todas as lojas.
- Contagem por loja com leitura de códigos de barras e pesquisa manual por código de artigo/descrição.
- Modo rápido: cada leitura adiciona uma unidade.
- Sincronização das contagens através do Supabase.
- Consolidação por artigo e loja, com opção de apagar a contagem de um artigo.
- Importação do Excel Primavera com as colunas `cod barras`, `Artigo`, `Descrição`, `Stock Atual`, `Últ. Preço de Compra (Artigo)` e `Armazém`.
- O stock é associado à combinação artigo + sigla do armazém. Stock negativo é guardado como veio do Primavera, mas apresentado como zero no Consolidado.

## Base de dados

O projeto utiliza o Supabase já configurado para esta aplicação. As tabelas e políticas existentes são mantidas na base de dados; alterações futuras serão feitas de forma controlada, conforme a necessidade do projeto.

Ficheiro de referência do esquema inicial: `supabase/inventario_schema.sql`.

Tabelas utilizadas:
- `inv_perfis`
- `inv_artigos`
- `inv_codigos_barras`
- `inv_inventarios`
- `inv_contagens`
- `inv_stock_lojas`

## Executar localmente

Requisitos: Bun (recomendado) ou Node.js 20+.

```bash
git clone https://github.com/ewertonrezende-star/inventario.git
cd inventario
bun install
bun run dev
```

Definir `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no ambiente ou num ficheiro `.env`.

## Testes e publicação

```bash
bun run test
bun run build
```

O workflow em `.github/workflows/deploy.yml` publica a versão estática no GitHub Pages com o caminho base `/inventario/`.

A chave `sb_publishable` é pública e destinada ao browser. Nunca colocar uma chave `service_role` no código cliente, em variáveis `VITE_*` ou no GitHub. A segurança dos dados depende das políticas RLS do Supabase.
