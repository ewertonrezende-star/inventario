import { describe, expect, it } from "vitest";
import { displayedStock, mergeCounts, parsePrimaveraRows, STORES } from "./inventory";

describe("Inventário Coopsintra", () => {
  it("reconhece as seis lojas e o armazém central", () => {
    expect(STORES.map((s) => s.code)).toEqual(["AL", "AM", "CO", "MM", "LC", "SA", "CC"]);
  });

  it("soma contagens por artigo e mantém a loja do inventário", () => {
    const inventories = new Map([
      ["inv-al", { id: "inv-al", loja: "AL" }],
      ["inv-co", { id: "inv-co", loja: "CO" }],
    ]);
    const merged = mergeCounts([
      { inventario_id: "inv-al", codigo_artigo: "A1", codigo_barras_lido: "5601", quantidade: 3, utilizador_id: null, dispositivo_id: null, contado_em: "" },
      { inventario_id: "inv-al", codigo_artigo: "A1", codigo_barras_lido: "5601", quantidade: 2, utilizador_id: null, dispositivo_id: null, contado_em: "" },
      { inventario_id: "inv-co", codigo_artigo: "A1", codigo_barras_lido: "5601", quantidade: 5, utilizador_id: null, dispositivo_id: null, contado_em: "" },
    ], inventories);
    expect(merged.find((r) => r.loja === "AL")?.contado).toBe(5);
    expect(merged.find((r) => r.loja === "CO")?.contado).toBe(5);
  });

  it("importa o layout real do Excel Primavera e separa o stock por armazém", () => {
    const parsed = parsePrimaveraRows([
      ["cod barras", "Artigo", "Descrição", "Stock Atual", "Últ. Preço de Compra (Artigo)", "Armazém"],
      ["5609687001758", "10100029", "Alimpadura de Trigo 5kg", 9, "1,69000", "AL"],
      ["5609687001758", "10100029", "Alimpadura de Trigo 5kg", -2, "1,69000", "CO"],
      ["", "10100030", "Produto sem EAN", 0, "2,50", "LC"],
    ]);
    expect(parsed.articles).toHaveLength(2);
    expect(parsed.barcodes).toEqual([{ codigo_barras: "5609687001758", codigo_artigo: "10100029" }]);
    expect(parsed.stocks.map((s) => [s.codigo_artigo, s.armazem, s.stock_atual])).toEqual([
      ["10100029", "AL", 9], ["10100029", "CO", -2], ["10100030", "LC", 0],
    ]);
  });

  it("apresenta stock negativo como zero sem alterar o original", () => {
    expect(displayedStock(-8)).toBe(0);
    expect(displayedStock(12)).toBe(12);
    expect(displayedStock(null)).toBeNull();
  });
});
