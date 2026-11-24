-- Catálogo partilhado de produtos cadastrados manualmente.
-- Não altera nem substitui a importação oficial do Primavera.
create table if not exists public.inv_produtos_manuais (
  codigo_artigo text primary key,
  codigo_barras text not null unique,
  descricao text not null,
  criado_por text,
  criado_em timestamptz not null default now()
);

alter table public.inv_produtos_manuais enable row level security;

drop policy if exists "produtos manuais leitura anon" on public.inv_produtos_manuais;
create policy "produtos manuais leitura anon"
  on public.inv_produtos_manuais for select to anon using (true);

drop policy if exists "produtos manuais inserir anon" on public.inv_produtos_manuais;
create policy "produtos manuais inserir anon"
  on public.inv_produtos_manuais for insert to anon
  with check (
    nullif(trim(descricao), '') is not null
    and char_length(trim(descricao)) <= 200
    and nullif(trim(codigo_barras), '') is not null
    and nullif(trim(criado_por), '') is not null
  );

drop policy if exists "produtos manuais atualizar anon" on public.inv_produtos_manuais;
create policy "produtos manuais atualizar anon"
  on public.inv_produtos_manuais for update to anon
  using (true)
  with check (
    nullif(trim(descricao), '') is not null
    and char_length(trim(descricao)) <= 200
  );

grant select, insert, update on public.inv_produtos_manuais to anon;

-- Permitir que uma contagem use um artigo do Primavera OU um produto manual.
drop policy if exists "contagens inserir anon" on public.inv_contagens;
create policy "contagens inserir anon"
  on public.inv_contagens for insert to anon with check (
    nullif(trim(contado_por), '') is not null
    and char_length(trim(contado_por)) <= 80
    and exists (
      select 1 from public.inv_inventarios i
      where i.id = inventario_id and i.estado = 'aberto'
    )
    and (
      exists (select 1 from public.inv_importacao_primavera p where p.artigo = inv_contagens.codigo_artigo)
      or exists (select 1 from public.inv_produtos_manuais m where m.codigo_artigo = inv_contagens.codigo_artigo)
    )
  );
