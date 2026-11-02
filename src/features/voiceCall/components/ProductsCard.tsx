import { ProductRow, PRODUCT_GRID } from "./ProductRow";
import { PlusIcon } from "./icons";
import {
  CARD,
  CARD_HEADER,
  CARD_TITLE,
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
    <section className={CARD} aria-labelledby="call-products-title">
      <div className={CARD_HEADER}>
        <div>
          <p className={SECTION_LABEL}>Call context</p>
          <h3 id="call-products-title" className={`${CARD_TITLE} mt-1 flex items-center gap-2`}>
            Products
            <span className={COUNT_BADGE}>{products.length}</span>
          </h3>
        </div>
        <button type="button" onClick={onAdd} className={GHOST_BTN}>
          <PlusIcon className="h-3.5 w-3.5" />
          Add product
        </button>
      </div>

      <div className="px-4 py-4">
        <div className={`${PRODUCT_GRID} mb-1.5 ${SECTION_LABEL} !tracking-[0.1em]`} aria-hidden="true">
          <span />
          <span>Model / Product</span>
          <span>Firmware</span>
          <span>Serial number</span>
          <span className="w-9" />
        </div>

        <div className="space-y-2">
          {products.map((product, index) => (
            <ProductRow
              key={product.id}
              index={index}
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
