-- Inventário Coopsintra: contagem sem login e leitura da base Primavera existente.
-- Executar uma vez no SQL Editor do projeto Supabase do Inventário.
-- Não altera Auth global, Portal nem tabelas de outras aplicações.

alter table public.inv_inventarios
  alter column criado_por drop not null,
  alter column criado_por drop default;

alter table public.inv_contagens
  add column if not exists contado_por text,
  alter column utilizador_id drop not null,
  alter column utilizador_id drop default;

-- A tabela importada pelo Primavera é a única fonte de artigos, códigos de barras,
-- descrições, preços e stocks por armazém.
drop policy if exists "primavera leitura anon inventario" on public.inv_importacao_primavera;
create policy "primavera leitura anon inventario"
  on public.inv_importacao_primavera for select to anon using (true);

drop policy if exists "inventarios leitura anon" on public.inv_inventarios;
create policy "inventarios leitura anon"
  on public.inv_inventarios for select to anon using (true);

drop policy if exists "inventarios criar anon" on public.inv_inventarios;
create policy "inventarios criar anon"
  on public.inv_inventarios for insert to anon
  with check (loja in ('AL','AM','CO','MM','LC','SA') and estado = 'aberto');

drop policy if exists "contagens leitura anon" on public.inv_contagens;
create policy "contagens leitura anon"
  on public.inv_contagens for select to anon using (
    exists (select 1 from public.inv_inventarios i where i.id = inventario_id)
  );

drop policy if exists "contagens inserir anon" on public.inv_contagens;
create policy "contagens inserir anon"
  on public.inv_contagens for insert to anon with check (
    nullif(trim(contado_por), '') is not null
    and char_length(trim(contado_por)) <= 80
    and exists (
      select 1 from public.inv_inventarios i
      where i.id = inventario_id and i.estado = 'aberto'
    )
    and exists (
      select 1 from public.inv_importacao_primavera p
      where p.artigo = codigo_artigo
    )
  );

grant usage on schema public to anon;
grant select on public.inv_importacao_primavera, public.inv_inventarios, public.inv_contagens to anon;
grant insert on public.inv_inventarios, public.inv_contagens to anon;

-- Permite excluir contagens apenas de inventários ainda abertos.
-- Como o app funciona sem login, qualquer pessoa com acesso ao app pode executar
-- esta ação; a confirmação é apresentada no próprio Consolidado.
drop policy if exists "contagens excluir anon inventario aberto" on public.inv_contagens;
create policy "contagens excluir anon inventario aberto"
  on public.inv_contagens for delete to anon using (
    exists (
      select 1 from public.inv_inventarios i
      where i.id = inventario_id and i.estado = 'aberto'
    )
  );

grant delete on public.inv_contagens to anon;
