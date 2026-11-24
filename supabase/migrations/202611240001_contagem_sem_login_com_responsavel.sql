-- Contagem sem login: o colaborador identifica-se pelo nome em cada sessão.
-- Executar no SQL Editor do projeto Supabase ligado ao inventário.

-- A aplicação não usa utilizadores Auth para identificar o responsável.
alter table public.inv_inventarios
  alter column criado_por drop not null,
  alter column criado_por drop default;

alter table public.inv_contagens
  add column if not exists contado_por text,
  alter column utilizador_id drop not null,
  alter column utilizador_id drop default;

-- Leitura pública necessária à operação de contagem e ao Consolidado.
drop policy if exists "artigos leitura anon" on public.inv_artigos;
create policy "artigos leitura anon"
  on public.inv_artigos for select to anon using (true);

drop policy if exists "codigos leitura anon" on public.inv_codigos_barras;
create policy "codigos leitura anon"
  on public.inv_codigos_barras for select to anon using (true);

drop policy if exists "codigos inserir anon" on public.inv_codigos_barras;
create policy "codigos inserir anon"
  on public.inv_codigos_barras for insert to anon
  with check (
    length(trim(codigo_barras)) between 1 and 100
    and exists (
      select 1 from public.inv_artigos a
      where a.codigo_artigo = inv_codigos_barras.codigo_artigo
    )
  );

drop policy if exists "inventarios leitura anon" on public.inv_inventarios;
create policy "inventarios leitura anon"
  on public.inv_inventarios for select to anon using (true);

drop policy if exists "inventarios criar anon" on public.inv_inventarios;
create policy "inventarios criar anon"
  on public.inv_inventarios for insert to anon
  with check (
    loja in ('AL','AM','CO','MM','LC','SA')
    and estado = 'aberto'
  );

drop policy if exists "contagens leitura anon" on public.inv_contagens;
create policy "contagens leitura anon"
  on public.inv_contagens for select to anon
  using (
    exists (
      select 1 from public.inv_inventarios i
      where i.id = inv_contagens.inventario_id
    )
  );

drop policy if exists "contagens inserir anon" on public.inv_contagens;
create policy "contagens inserir anon"
  on public.inv_contagens for insert to anon
  with check (
    nullif(trim(contado_por), '') is not null
    and char_length(trim(contado_por)) <= 80
    and exists (
      select 1 from public.inv_inventarios i
      where i.id = inv_contagens.inventario_id
        and i.estado = 'aberto'
    )
    and exists (
      select 1 from public.inv_artigos a
      where a.codigo_artigo = inv_contagens.codigo_artigo
        and a.ativo = true
    )
  );

-- O Consolidado precisa de consultar o stock das lojas.
do $$
begin
  if to_regclass('public.inv_stock_lojas') is not null then
    execute 'drop policy if exists "stock leitura anon" on public.inv_stock_lojas';
    execute 'create policy "stock leitura anon" on public.inv_stock_lojas for select to anon using (true)';
    execute 'grant select on public.inv_stock_lojas to anon';
  end if;
end $$;

grant usage on schema public to anon;
grant select on public.inv_artigos, public.inv_codigos_barras,
  public.inv_inventarios, public.inv_contagens to anon;
grant insert on public.inv_codigos_barras, public.inv_inventarios,
  public.inv_contagens to anon;

-- Nota de segurança:
-- Não é criada política de DELETE para anon. Sem autenticação, permitir
-- apagar contagens a qualquer visitante exporia o histórico a eliminação.
