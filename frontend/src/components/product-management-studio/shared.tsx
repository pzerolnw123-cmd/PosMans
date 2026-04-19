import type { ReactNode } from "react";
import type { ProductItem } from "@/components/product-management-studio/types";

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-[8px] max-[1180px]:gap-[6px] ${className}`.trim()}>
      <span className="text-[0.92rem] font-semibold text-[#6b7a94]">{label}</span>
      {children}
    </label>
  );
}

export function ProductImage({
  product,
  className,
  fallbackClassName,
}: {
  product: ProductItem;
  className: string;
  fallbackClassName: string;
}) {
  if (product.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={product.imageUrl} alt={product.name} className={className} />;
  }

  return <div className={fallbackClassName} />;
}
