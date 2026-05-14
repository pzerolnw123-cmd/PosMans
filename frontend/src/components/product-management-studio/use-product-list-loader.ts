import type { Dispatch, SetStateAction } from "react";
import { useEffect } from "react";
import { requestProductList } from "@/components/product-management-studio/lib";
import type { ProductCategory, ProductItem } from "@/components/product-management-studio/types";

type ProductPagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

type ProductListLoaderOptions = {
  activeCategory: ProductCategory;
  itemsPerPage: number;
  page: number;
  pendingDraft: ProductItem | null;
  setPage: Dispatch<SetStateAction<number>>;
  setPagination: Dispatch<SetStateAction<ProductPagination>>;
  setProducts: Dispatch<SetStateAction<ProductItem[]>>;
  setProductsLoading: Dispatch<SetStateAction<boolean>>;
  setSelectedId: Dispatch<SetStateAction<string>>;
  setServerProducts: Dispatch<SetStateAction<ProductItem[]>>;
  setUploadError: Dispatch<SetStateAction<string | null>>;
};

export function useProductListLoader({
  activeCategory,
  itemsPerPage,
  page,
  pendingDraft,
  setPage,
  setPagination,
  setProducts,
  setProductsLoading,
  setSelectedId,
  setServerProducts,
  setUploadError,
}: ProductListLoaderOptions) {
  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        setProductsLoading(true);
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(itemsPerPage),
          category: activeCategory,
        });
        const response = await requestProductList(params);
        if (cancelled) return;

        setPagination(response.pagination);

        if (response.pagination.page !== page) {
          setPage(response.pagination.page);
        }

        const nextProducts = pendingDraft ? [pendingDraft, ...response.products.filter((item) => item.id !== pendingDraft.id)] : response.products;

        if (nextProducts.length > 0) {
          const limitedProducts = nextProducts.slice(0, itemsPerPage);
          setProducts(limitedProducts);
          setServerProducts(response.products);
          setSelectedId((current) => (limitedProducts.some((item) => item.id === current) ? current : limitedProducts[0].id));
          return;
        }

        setProducts([]);
        setServerProducts([]);
        setSelectedId("");
      } catch (error) {
        if (!cancelled) {
          setUploadError(error instanceof Error ? error.message : "โหลดรายการสินค้าไม่สำเร็จ");
        }
      } finally {
        if (!cancelled) {
          setProductsLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [activeCategory, itemsPerPage, page, pendingDraft, setPage, setPagination, setProducts, setProductsLoading, setSelectedId, setServerProducts, setUploadError]);
}
