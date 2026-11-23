import { describe, it, expect } from "vitest";
import { mergeCounts, parseProductRows, STORES } from "./inventory";

describe("inventário", () => {
  it("tem as 7 localizações", () => {
    expect(STORES.map((s) => s.code)).toEqual(["AL", "AM", "CO", "MM", "SA", "LC", "CC"]);
  });
  it("soma contagens de pessoas diferentes na mesma loja", () => {
    const m = mergeCounts([
      { store_code: "AL", barcode: "1", quantity: 3, counter_name: "Ana" },
      { store_code: "AL", barcode: "1", quantity: 2, counter_name: "Rui" },
      { store_code: "CO", barcode: "1", quantity: 5, counter_name: "Ana" },
    ]);
    expect(m.find((r) => r.store_code === "AL")?.total).toBe(5);
    expect(m.find((r) => r.store_code === "CO")?.total).toBe(5);
  });
  it("lê Excel: cód barras, artigo, descrição, stock, valor €", () => {
    expect(parseProductRows([["Cod Barras", "Artigo", "Descrição", "Stock", "Valor"], ["5601234", "A1", "Leite", 12, "1,25 €"]]))
      .toEqual([{ barcode: "5601234", reference: "A1", description: "Leite", stock: 12, price: 1.25 }]);
  });
});