import type { ReactNode } from "react";
import Image from "next/image";
import type { ProductItem } from "@/components/product-management-studio/types";

const clientImageRemoteOrigins = [
  process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL,
  process.env.NEXT_PUBLIC_IMAGE_REMOTE_ORIGINS,
]
  .filter(Boolean)
  .flatMap((value) => String(value).split(","))
  .map((value) => value.trim())
  .filter(Boolean);

export function canUseNextImage(src: string) {
  if (!src.startsWith("http") || clientImageRemoteOrigins.length === 0) {
    return false;
  }

  try {
    const srcOrigin = new URL(src).origin;
    return clientImageRemoteOrigins.some((origin) => new URL(origin).origin === srcOrigin);
  } catch {
    return false;
  }
}

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
      <span className="text-[0.92rem] font-semibold text-[var(--eyebrow)]">{label}</span>
      {children}
    </label>
  );
}

export function ProductImage({
  product,
  className,
  fallbackClassName,
  sizes = "74px",
}: {
  product: ProductItem;
  className: string;
  fallbackClassName: string;
  sizes?: string;
}) {
  if (product.imageUrl) {
    if (canUseNextImage(product.imageUrl)) {
      return (
        <Image
          src={product.imageUrl}
          alt={product.name}
          width={148}
          height={148}
          sizes={sizes}
          className={className}
        />
      );
    }

    // eslint-disable-next-line @next/next/no-img-element
    return <img src={product.imageUrl} alt={product.name} className={className} loading="lazy" decoding="async" />;
  }

  return <div className={fallbackClassName} />;
}
