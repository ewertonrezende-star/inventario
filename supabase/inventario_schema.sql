-- Coopsintra | Inventário ligado à importação Primavera existente.
-- Este ficheiro NÃO cria tabelas. O projeto deve conter apenas:
-- inv_contagens, inv_importacao_primavera, inv_inventarios e inv_perfis.
-- Para ativar a operação sem login, executar a migration
-- 202611240001_contagem_sem_login_com_responsavel.sql.

-- Índices de pesquisa na tabela de importação já existente.
create index if not exists inv_importacao_primavera_artigo_idx
  on public.inv_importacao_primavera (artigo);
create index if not exists inv_importacao_primavera_armazem_idx
  on public.inv_importacao_primavera (armazem);
create index if not exists inv_importacao_primavera_cod_barras_idx
  on public.inv_importacao_primavera (cod_barras);

-- Índices para consultar as contagens por inventário e artigo.
create index if not exists inv_contagens_inventario_artigo_idx
  on public.inv_contagens (inventario_id, codigo_artigo);
create index if not exists inv_contagens_contado_em_idx
  on public.inv_contagens (contado_em desc);
