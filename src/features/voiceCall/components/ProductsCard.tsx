import { ProductRow } from "./ProductRow";
import { PlusIcon } from "./icons";
import type { ProductEntry } from "../types";

type ProductsCardProps = {
  products: ProductEntry[];
  onAdd: () => void;
  onChange: (id: string, patch: Partial<Omit<ProductEntry, "id">>) => void;
  onRemove: (id: string) => void;
};

/** Repeatable list of products discussed on the call. */
export function ProductsCard({
  products,
  onAdd,
  onChange,
  onRemove,
}: ProductsCardProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Products
        </h3>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      <div className="mb-1.5 grid grid-cols-[1fr_1fr_1fr_auto] gap-3 px-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
        <span>Product / Model</span>
        <span>Firmware</span>
        <span>Serial #</span>
        <span className="w-8" />
      </div>

      <div className="space-y-2">
        {products.map((product) => (
          <ProductRow
            key={product.id}
            product={product}
            canRemove={products.length > 1}
            onChange={(patch) => onChange(product.id, patch)}
            onRemove={() => onRemove(product.id)}
          />
        ))}
      </div>
    </section>
  );
}
