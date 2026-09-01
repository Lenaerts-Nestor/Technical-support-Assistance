import { ProductRow } from "./ProductRow";
import { PlusIcon } from "./icons";
import {
  CARD,
  CARD_HEADER,
  COUNT_BADGE,
  GHOST_BTN,
  SECTION_LABEL,
} from "../../../shared/ui/styles";
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
    <section className={CARD}>
      <div className={CARD_HEADER}>
        <div className="flex items-center gap-2">
          <h3 className={SECTION_LABEL}>Products</h3>
          <span className={COUNT_BADGE}>{products.length}</span>
        </div>
        <button type="button" onClick={onAdd} className={GHOST_BTN}>
          <PlusIcon className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      <div className="p-4">
        <div className="text-ink-faint mb-2 grid grid-cols-[1fr_1fr_1fr_auto] gap-3 px-1 text-[11px] font-semibold tracking-[0.06em] uppercase">
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
      </div>
    </section>
  );
}
