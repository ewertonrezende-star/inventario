CREATE TABLE public.stores (code text PRIMARY KEY, name text NOT NULL);
GRANT SELECT ON public.stores TO anon, authenticated; GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read stores" ON public.stores FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.stores VALUES ('AL','Albarraque'),('AM','Arneiro Marinheiro'),('CO','Colares'),('MM','Mem Martins'),('SA','Sabugo'),('LC','Sintra'),('CC','Armazém Central');

CREATE TABLE public.products (barcode text PRIMARY KEY, reference text, description text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO anon, authenticated; GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all products" ON public.products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.counts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_code text NOT NULL REFERENCES public.stores(code), barcode text NOT NULL, quantity numeric NOT NULL DEFAULT 1, counter_name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX ON public.counts(store_code, barcode);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.counts TO anon, authenticated; GRANT ALL ON public.counts TO service_role;
ALTER TABLE public.counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all counts" ON public.counts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);