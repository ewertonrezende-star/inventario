# Coopsintra Stock — Inventário de Lojas

Aplicação web de inventário por leitura de código de barras, com registo de contagens por loja e consolidação dos resultados.

## Repositório oficial

O desenvolvimento passa a ser feito diretamente neste repositório GitHub. O código-fonte está na branch `main`.

## Tecnologias

- React 19 + TypeScript
- TanStack Start / TanStack Router
- Vite
- Tailwind CSS
- Supabase (autenticação e base de dados)
- Vitest

## Estrutura principal

- `src/routes/index.tsx`: contagem por loja e leitura de códigos de barras
- `src/routes/consolidado.tsx`: mapa consolidado das contagens
- `src/routes/produtos.tsx`: gestão/consulta de produtos
- `src/integrations/supabase/`: clientes e tipos da base de dados
- `supabase/` e `drizzle/`: configuração e migrações da base de dados

## Executar localmente

Requisitos: Node.js 20+ e npm.

```bash
git clone https://github.com/ewertonrezende-star/inventario.git
cd inventario
npm install
```

Crie um ficheiro `.env` na raiz, usando `.env.example` como modelo, e preencha as credenciais do projeto Supabase.

Depois execute:

```bash
npm run dev
```

## Verificações

```bash
npm run lint
npm test
npm run build
```

## Variáveis de ambiente

- `VITE_SUPABASE_URL`: URL pública do projeto Supabase
- `VITE_SUPABASE_PUBLISHABLE_KEY`: chave pública/publishable usada pelo browser
- `SUPABASE_URL`: URL do Supabase para o servidor
- `SUPABASE_PUBLISHABLE_KEY`: chave publishable para operações SSR
- `SUPABASE_SERVICE_ROLE_KEY`: chave secreta, apenas para operações administrativas no servidor

Nunca publique chaves secretas no GitHub nem coloque `SUPABASE_SERVICE_ROLE_KEY` em variáveis com prefixo `VITE_`. Em produção, configure os segredos no serviço de alojamento.

## Publicação

Esta aplicação usa TanStack Start com renderização no servidor. O GitHub guarda o código e o histórico; GitHub Pages, por ser alojamento estático, não executa por si só o servidor da aplicação. A publicação deve ser feita num alojamento compatível com TanStack Start/Nitro, configurando as variáveis de ambiente acima.

## Base de dados

As migrações SQL estão em `supabase/` e `drizzle/migrations/`. Não execute migrações em produção sem confirmar primeiro o estado atual da base de dados e manter uma cópia de segurança.
