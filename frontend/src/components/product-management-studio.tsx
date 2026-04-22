"use client";

import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useBackofficeShellAlert } from "@/components/backoffice-shell";
import { ConfirmDeleteModal } from "@/components/product-management-studio/confirm-delete-modal";
import { CropModal } from "@/components/product-management-studio/crop-modal";
import { ProductDetailPanel } from "@/components/product-management-studio/detail-panel";
import {
  ACCEPTED_IMAGE_TYPES,
  clampOffset,
  createCroppedBlob,
  CROP_VIEWPORT_SIZE,
  createImageObjectUrl,
  loadImage,
  MAX_IMAGE_BYTES,
  requestJson,
  requestSignedUpload,
  revokeManagedObjectUrl,
  uploadBlobToR2,
} from "@/components/product-management-studio/lib";
import { ProductListPanel } from "@/components/product-management-studio/list-panel";
import {
  categoryOptions,
  isDraftProduct,
  makeNewProduct,
  type CropDraft,
  type ProductCategory,
  type ProductItem,
  type ProductListResponse,
} from "@/components/product-management-studio/types";
import { PageHeader, StatusPill } from "@/components/ui-primitives";

export function ProductManagementStudio() {
  const { setShellAlert } = useBackofficeShellAlert();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [serverProducts, setServerProducts] = useState<ProductItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<ProductCategory>("ทั้งหมด");
  const [selectedId, setSelectedId] = useState("");
  const [page, setPage] = useState(1);
  const [compactMode, setCompactMode] = useState(false);
  const [cropDraft, setCropDraft] = useState<CropDraft | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [productsLoading, setProductsLoading] = useState(true);
  const [saveBusy, setSaveBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pendingUploadBlob, setPendingUploadBlob] = useState<Blob | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 3,
    totalItems: 0,
    totalPages: 1,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const pendingDraftRef = useRef<ProductItem | null>(null);
  const itemsPerPage = pagination.pageSize;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1181px) and (max-height: 860px)");
    const syncCompactMode = () => setCompactMode(mediaQuery.matches);

    syncCompactMode();
    mediaQuery.addEventListener("change", syncCompactMode);

    return () => mediaQuery.removeEventListener("change", syncCompactMode);
  }, []);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    setShellAlert(uploadError ? { message: uploadError } : null);

    return () => {
      setShellAlert(null);
    };
  }, [setShellAlert, uploadError]);

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
        const response = await requestJson<ProductListResponse>(`/api/products?${params.toString()}`);
        if (cancelled) return;

        setPagination(response.pagination);

        if (response.pagination.page !== page) {
          setPage(response.pagination.page);
        }

        const pendingDraft = pendingDraftRef.current;
        const nextProducts = pendingDraft
          ? [pendingDraft, ...response.products.filter((item) => item.id !== pendingDraft.id)]
          : response.products;

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
  }, [activeCategory, itemsPerPage, page]);

  const effectiveSelectedId = pendingDraftRef.current?.id ?? selectedId;
  const selectedProduct = products.find((item) => item.id === effectiveSelectedId) ?? products[0] ?? null;
  const totalPages = pagination.totalPages;
  const currentPage = pagination.page;
  const visibleProducts = pendingDraftRef.current ? products : products.filter((item) => !isDraftProduct(item));
  const isDirty = selectedProduct ? (
    isDraftProduct(selectedProduct) ||
    !serverProducts.find((p) => p.id === selectedProduct.id) ||
    (() => {
      const original = serverProducts.find((p) => p.id === selectedProduct.id)!;
      return (
        selectedProduct.name !== original.name ||
        selectedProduct.category !== original.category ||
        selectedProduct.price !== original.price ||
        selectedProduct.status !== original.status ||
        selectedProduct.trackStock !== original.trackStock ||
        selectedProduct.stockQuantity !== original.stockQuantity ||
        selectedProduct.lowStockThreshold !== original.lowStockThreshold ||
        selectedProduct.imageUrl !== original.imageUrl ||
        selectedProduct.uploadedKey !== original.uploadedKey
      );
    })()
  ) : false;

  function updateSelectedProduct(patch: Partial<ProductItem>) {
    if (!selectedProduct) return;

    setProducts((current) => current.map((item) => (item.id === selectedProduct.id ? { ...item, ...patch } : item)));
  }

  function handleToggleStock() {
    if (!selectedProduct) return;

    const willEnableStock = !selectedProduct.trackStock;
    updateSelectedProduct({
      trackStock: willEnableStock,
      stockQuantity: selectedProduct.trackStock ? 0 : selectedProduct.stockQuantity,
      lowStockThreshold: selectedProduct.trackStock ? 0 : selectedProduct.lowStockThreshold,
    });
    setUploadError(null);
    setShellAlert({
      tone: willEnableStock ? "info" : "info",
      message: willEnableStock
        ? "เปิดระบบสต๊อกแล้ว กรุณากรอกจำนวนคงเหลือและจุดแจ้งเตือนก่อนบันทึก"
        : "ปิดระบบสต๊อกแล้ว จำนวนคงเหลือและแจ้งเตือนใกล้หมดจะถูกตั้งเป็น 0 เมื่อบันทึก",
    });
  }

  function handleCategoryChange(category: ProductCategory) {
    setActiveCategory(category);
    setPage(1);
  }

  function handleCreateNewProduct() {
    const next = makeNewProduct();
    pendingDraftRef.current = next;
    setProducts((current) => [next, ...current].slice(0, itemsPerPage));
    setSelectedId(next.id);
    setActiveCategory(categoryOptions[0]);
    setPage(1);
    setUploadError(null);
  }

  async function handleSaveChanges() {
    if (!selectedProduct) {
      return;
    }

    const trimmedName = selectedProduct.name.trim();
    if (!trimmedName) {
      setUploadError("กรุณากรอกชื่อสินค้าก่อนบันทึก");
      return;
    }

    if (!Number.isFinite(selectedProduct.price) || selectedProduct.price < 0) {
      setUploadError("กรุณากรอกราคาให้ถูกต้อง");
      return;
    }

    if (
      selectedProduct.trackStock &&
      (!Number.isFinite(selectedProduct.stockQuantity) ||
        selectedProduct.stockQuantity < 0 ||
        !Number.isFinite(selectedProduct.lowStockThreshold) ||
        selectedProduct.lowStockThreshold < 0)
    ) {
      setUploadError("กรุณากรอกข้อมูลสต๊อกให้ถูกต้อง");
      return;
    }

    setUploadError(null);
    setSaveBusy(true);
    try {
      let finalUploadedKey = selectedProduct.uploadedKey;
      let finalImageUrl = selectedProduct.imageUrl;

      if (pendingUploadBlob) {
        const signedUpload = await requestSignedUpload(
          `${selectedProduct.code.toLowerCase()}-${Date.now()}.webp`,
          "image/webp",
          pendingUploadBlob.size
        );
        await uploadBlobToR2(signedUpload, pendingUploadBlob);
        finalUploadedKey = signedUpload.objectKey;
        finalImageUrl = signedUpload.publicUrl ?? undefined;
      }

      const basePayload = {
        name: trimmedName,
        category: selectedProduct.category,
        price: selectedProduct.price,
        status: selectedProduct.status,
        trackStock: selectedProduct.trackStock,
        stockQuantity: selectedProduct.trackStock ? selectedProduct.stockQuantity : 0,
        lowStockThreshold: selectedProduct.trackStock ? selectedProduct.lowStockThreshold : 0,
      };
      const uploadPayload = pendingUploadBlob || isDraftProduct(selectedProduct)
        ? {
            imageUrl: finalImageUrl?.startsWith("http") ? finalImageUrl : null,
            uploadedKey: finalUploadedKey || null,
          }
        : {};
      const payload = { ...basePayload, ...uploadPayload };

      if (isDraftProduct(selectedProduct)) {
        const created = await requestJson<ProductItem>("/api/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        const clientCreated =
          !created.imageUrl && selectedProduct.imageUrl?.startsWith("blob:")
            ? { ...created, imageUrl: selectedProduct.imageUrl, uploadedKey: selectedProduct.uploadedKey }
            : created;

        setProducts((current) => current.map((item) => (item.id === selectedProduct.id ? clientCreated : item)));
        setServerProducts((current) => [created, ...current]);
        setSelectedId(clientCreated.id);
        pendingDraftRef.current = null;
        setPendingUploadBlob(null);
        setPagination((current) => {
          const totalItems = current.totalItems + 1;
          return {
            ...current,
            totalItems,
            totalPages: Math.max(1, Math.ceil(totalItems / current.pageSize)),
          };
        });

        setShellAlert({ message: "เพิ่มสินค้าใหม่เข้าสู่ระบบเรียบร้อยแล้ว", tone: "success" });
        return;
      }

      const updated = await requestJson<ProductItem>(`/api/products/${selectedProduct.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      const clientUpdated =
        !updated.imageUrl && selectedProduct.imageUrl?.startsWith("blob:")
          ? { ...updated, imageUrl: selectedProduct.imageUrl, uploadedKey: selectedProduct.uploadedKey }
          : updated;

      setProducts((current) => current.map((item) => (item.id === updated.id ? { ...item, ...clientUpdated } : item)));
      setServerProducts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setPendingUploadBlob(null);
      
      setShellAlert({ message: "บันทึกการเปลี่ยนแปลงสินค้าเรียบร้อยแล้ว", tone: "success" });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "บันทึกสินค้าไม่สำเร็จ");
    } finally {
      setSaveBusy(false);
    }
  }

  function handleResetForm() {
    if (!selectedProduct) return;

    if (isDraftProduct(selectedProduct)) {
      const resetDraft = makeNewProduct();
      setProducts((current) =>
        current.map((item) =>
          item.id === selectedProduct.id
            ? { ...resetDraft, id: selectedProduct.id, imageUrl: selectedProduct.imageUrl, uploadedKey: selectedProduct.uploadedKey ?? "" }
            : item
        )
      );
      setUploadError(null);
      return;
    }

    const original = serverProducts.find((item) => item.id === selectedProduct.id);
    if (!original) return;

    objectUrlsRef.current = revokeManagedObjectUrl(selectedProduct.imageUrl, objectUrlsRef.current);
    setProducts((current) => current.map((item) => (item.id === selectedProduct.id ? { ...original } : item)));
    setUploadError(null);
    setPendingUploadBlob(null);
  }

  function handleBackToProducts() {
    let nextSelectedId = "";
    if (selectedProduct) {
      if (isDraftProduct(selectedProduct)) {
        pendingDraftRef.current = null;
        const restoredProducts = serverProducts.slice(0, itemsPerPage);
        setProducts(restoredProducts);
        nextSelectedId = restoredProducts[0]?.id ?? "";
      } else {
        // หากเป็นสินค้าเดิม ให้ย้อนคืนข้อมูลล่าสุดจาก Server เผื่อมีการแก้ค้างไว้
        const original = serverProducts.find((p) => p.id === selectedProduct.id);
        if (original) {
          setProducts((current) => current.map((item) => (item.id === selectedProduct.id ? { ...original } : item)));
          nextSelectedId = original.id;
        }
      }
    }
    setSelectedId(nextSelectedId);
    setUploadError(null);
    setPendingUploadBlob(null);
  }

  function handleToggleSaleStatus() {
    if (!selectedProduct) return;

    updateSelectedProduct({
      status: selectedProduct.status === "พร้อมขาย" ? "ปิดขาย" : "พร้อมขาย",
    });
    setUploadError(null);
  }

  function handleChooseImageClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
      setUploadError("รองรับเฉพาะไฟล์ JPG, PNG และ WEBP");
      return;
    }

    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
      setUploadError("ไฟล์ใหญ่เกิน 5 MB หรือมีขนาดไม่ถูกต้อง");
      return;
    }

    let objectUrl = "";

    try {
      objectUrl = createImageObjectUrl(file);
      objectUrlsRef.current.push(objectUrl);
      const image = await loadImage(objectUrl);
      setCropDraft({ fileName: file.name, objectUrl, image });
      setCropZoom(1);
      setCropOffset({ x: 0, y: 0 });
      setUploadError(null);
    } catch (error) {
      objectUrlsRef.current = revokeManagedObjectUrl(objectUrl, objectUrlsRef.current);
      setUploadError(error instanceof Error ? error.message : "ไม่สามารถเตรียมรูปภาพสำหรับอัปโหลดได้");
    }
  }

  function handleCropZoomChange(nextZoom: number) {
    if (!cropDraft) return;

    setCropOffset((current) => clampOffset(cropDraft.image, nextZoom, current.x, current.y, CROP_VIEWPORT_SIZE));
    setCropZoom(nextZoom);
  }

  function handleCropOffsetChange(nextX: number, nextY: number) {
    if (!cropDraft) return;

    setCropOffset(clampOffset(cropDraft.image, cropZoom, nextX, nextY, CROP_VIEWPORT_SIZE));
  }

  async function handleCropConfirm() {
    if (!cropDraft || !selectedProduct) {
      return;
    }

    try {
      setUploadBusy(true);
      setUploadError(null);

      const croppedBlob = await createCroppedBlob(cropDraft, cropZoom, cropOffset.x, cropOffset.y);
      
      objectUrlsRef.current = revokeManagedObjectUrl(selectedProduct.imageUrl, objectUrlsRef.current);
      objectUrlsRef.current = revokeManagedObjectUrl(cropDraft.objectUrl, objectUrlsRef.current);
      const localPreviewUrl = URL.createObjectURL(croppedBlob);
      objectUrlsRef.current.push(localPreviewUrl);

      setPendingUploadBlob(croppedBlob);

      updateSelectedProduct({
        imageUrl: localPreviewUrl,
        uploadedKey: "",
      });

      setCropDraft(null);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "เตรียมรูปภาพไม่สำเร็จ");
    } finally {
      setUploadBusy(false);
    }
  }

  function handleCropClose() {
    if (!cropDraft || uploadBusy) {
      return;
    }

    objectUrlsRef.current = revokeManagedObjectUrl(cropDraft.objectUrl, objectUrlsRef.current);
    setCropDraft(null);
  }

  function handleDeleteRequest() {
    if (!selectedProduct) return;
    setIsDeleteModalOpen(true);
  }

  async function handleFinalDelete() {
    if (!selectedProduct) {
      return;
    }

    if (isDraftProduct(selectedProduct)) {
      pendingDraftRef.current = null;
      objectUrlsRef.current = revokeManagedObjectUrl(selectedProduct.imageUrl, objectUrlsRef.current);
      const remaining = products.filter((item) => item.id !== selectedProduct.id);
      setProducts(remaining);
      setSelectedId(remaining[0]?.id ?? "");
      setPage(1);
      setIsDeleteModalOpen(false);
      
      setShellAlert({ message: "ยกเลิกรายการสินค้าสำเร็จ", tone: "success" });
      return;
    }

    try {
      setDeleteBusy(true);
      await requestJson(`/api/products/${selectedProduct.id}`, {
        method: "DELETE",
      });

      objectUrlsRef.current = revokeManagedObjectUrl(selectedProduct.imageUrl, objectUrlsRef.current);
      const remaining = products.filter((item) => item.id !== selectedProduct.id);
      setProducts(remaining);
      setServerProducts((current) => current.filter((item) => item.id !== selectedProduct.id));
      setSelectedId(remaining[0]?.id ?? "");
      setPagination((current) => {
        const totalItems = Math.max(0, current.totalItems - 1);
        const totalPages = Math.max(1, Math.ceil(totalItems / current.pageSize));
        return {
          ...current,
          totalItems,
          totalPages,
        };
      });
      setPage((current) => (remaining.length === 0 ? Math.max(1, current - 1) : current));

      setShellAlert({ message: "ลบสินค้าออกจากระบบเรียบร้อยแล้ว", tone: "success" });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "ลบสินค้าไม่สำเร็จ");
    } finally {
      setDeleteBusy(false);
      setIsDeleteModalOpen(false);
    }
  }

  return (
    <div
      className={
        compactMode
          ? "grid h-full min-h-0 grid-rows-[minmax(0,1fr)] gap-[18px]"
          : "grid h-full min-h-0 grid-rows-[156px_minmax(0,1fr)] gap-[18px] max-[1180px]:grid-rows-[auto_minmax(0,1fr)]"
      }
    >
      {!compactMode ? (
        <PageHeader
          eyebrow="Product Studio"
          title="สินค้า"
          description={
            <>
              จัดการรายการสินค้าของคุณ ทั้งการแก้ไขราคา หมวดหมู่ และสถานะการขาย <br /> พร้อมระบบอัปโหลดรูปภาพที่รวดเร็ว
            </>
          }
          actions={<StatusPill tone="success">พร้อมใช้งานแล้ว</StatusPill>}
        />
      ) : null}

      <div className="grid min-h-0 items-start gap-[18px] [grid-template-columns:minmax(400px,1fr)_minmax(0,1.3fr)] max-[1180px]:grid-cols-1">
        <ProductDetailPanel
          compactMode={compactMode}
          productsLoading={productsLoading}
          saveBusy={saveBusy}
          deleteBusy={deleteBusy}
          isDirty={isDirty}
          selectedProduct={selectedProduct}
          onCreateNewProduct={handleCreateNewProduct}
          onUpdateProduct={updateSelectedProduct}
          onSaveChanges={handleSaveChanges}
          onChooseImageClick={handleChooseImageClick}
          onBackToProducts={handleBackToProducts}
          onToggleSaleStatus={handleToggleSaleStatus}
          onToggleStock={handleToggleStock}
          onResetForm={handleResetForm}
          onDeleteConfirmed={handleDeleteRequest}
        />

        <ProductListPanel
          activeCategory={activeCategory}
          currentPage={currentPage}
          filteredCount={pagination.totalItems}
          itemsPerPage={itemsPerPage}
          productsLoading={productsLoading}
          selectionTransitionLocked={Boolean(pendingDraftRef.current)}
          selectedId={effectiveSelectedId}
          totalPages={totalPages}
          visibleProducts={visibleProducts}
          onCategoryChange={handleCategoryChange}
          onPageChange={setPage}
          onSelectProduct={setSelectedId}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelection}
      />

      {cropDraft ? (
        <CropModal
          draft={cropDraft}
          zoom={cropZoom}
          offsetX={cropOffset.x}
          offsetY={cropOffset.y}
          busy={uploadBusy}
          onClose={handleCropClose}
          onConfirm={handleCropConfirm}
          onZoomChange={handleCropZoomChange}
          onOffsetChange={handleCropOffsetChange}
        />
      ) : null}

      {isDeleteModalOpen && selectedProduct ? (
        <ConfirmDeleteModal
          product={selectedProduct}
          busy={deleteBusy}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleFinalDelete}
        />
      ) : null}
    </div>
  );
}
