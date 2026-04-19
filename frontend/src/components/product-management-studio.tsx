"use client";

import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useBackofficeShellAlert } from "@/components/backoffice-shell";
import { CropModal } from "@/components/product-management-studio/crop-modal";
import { ProductDetailPanel } from "@/components/product-management-studio/detail-panel";
import {
  ACCEPTED_IMAGE_TYPES,
  clampOffset,
  createCroppedBlob,
  CROP_VIEWPORT_SIZE,
  loadImage,
  MAX_IMAGE_BYTES,
  readFileAsDataUrl,
  requestJson,
  requestSignedUpload,
  revokeManagedObjectUrl,
  uploadBlobToR2,
} from "@/components/product-management-studio/lib";
import { ProductListPanel } from "@/components/product-management-studio/list-panel";
import { categoryOptions, isDraftProduct, makeNewProduct, type CropDraft, type ProductCategory, type ProductItem } from "@/components/product-management-studio/types";
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

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const itemsPerPage = 3;

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
        const nextProducts = await requestJson<ProductItem[]>("/api/products");
        if (cancelled) return;

        if (Array.isArray(nextProducts) && nextProducts.length > 0) {
          setProducts(nextProducts);
          setServerProducts(nextProducts);
          setSelectedId((current) => (nextProducts.some((item) => item.id === current) ? current : nextProducts[0].id));
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
  }, []);

  const selectedProduct = products.find((item) => item.id === selectedId) ?? products[0] ?? null;
  const filteredProducts = activeCategory === "ทั้งหมด" ? products : products.filter((item) => item.category === activeCategory);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const currentPage = Math.min(page, totalPages);
  const visibleProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  function updateSelectedProduct(patch: Partial<ProductItem>) {
    if (!selectedProduct) return;

    setProducts((current) => current.map((item) => (item.id === selectedProduct.id ? { ...item, ...patch } : item)));
  }

  function handleCategoryChange(category: ProductCategory) {
    setActiveCategory(category);
    setPage(1);
  }

  function handleCreateNewProduct() {
    const next = makeNewProduct();
    setProducts((current) => [next, ...current]);
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

    setUploadError(null);
    setSaveBusy(true);

    try {
      const payload = {
        name: trimmedName,
        category: selectedProduct.category,
        price: selectedProduct.price,
        status: selectedProduct.status,
        imageUrl: selectedProduct.imageUrl?.startsWith("http") ? selectedProduct.imageUrl : null,
        uploadedKey: selectedProduct.uploadedKey || null,
      };

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
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "บันทึกสินค้าไม่สำเร็จ");
    } finally {
      setSaveBusy(false);
    }
  }

  function handleResetForm() {
    if (!selectedProduct) return;

    if (isDraftProduct(selectedProduct)) {
      setProducts((current) => current.filter((item) => item.id !== selectedProduct.id));
      const remaining = products.filter((item) => item.id !== selectedProduct.id);
      setSelectedId(remaining[0]?.id ?? "");
      setUploadError(null);
      return;
    }

    const original = serverProducts.find((item) => item.id === selectedProduct.id);
    if (!original) return;

    objectUrlsRef.current = revokeManagedObjectUrl(selectedProduct.imageUrl, objectUrlsRef.current);
    setProducts((current) => current.map((item) => (item.id === selectedProduct.id ? { ...original } : item)));
    setUploadError(null);
  }

  function handleBackToProducts() {
    setSelectedId("");
    setUploadError(null);
  }

  function handleToggleSaleStatus() {
    if (!selectedProduct) return;

    updateSelectedProduct({
      status: selectedProduct.status === "พร้อมขาย" ? "ใกล้หมด" : "พร้อมขาย",
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

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const image = await loadImage(dataUrl);
      setCropDraft({ fileName: file.name, dataUrl, image });
      setCropZoom(1);
      setCropOffset({ x: 0, y: 0 });
      setUploadError(null);
    } catch (error) {
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
      const signedUpload = await requestSignedUpload(`${selectedProduct.code.toLowerCase()}-${Date.now()}.webp`, "image/webp", croppedBlob.size);

      await uploadBlobToR2(signedUpload, croppedBlob);

      objectUrlsRef.current = revokeManagedObjectUrl(selectedProduct.imageUrl, objectUrlsRef.current);
      const localPreviewUrl = URL.createObjectURL(croppedBlob);
      objectUrlsRef.current.push(localPreviewUrl);

      updateSelectedProduct({
        imageUrl: signedUpload.publicUrl || localPreviewUrl,
        uploadedKey: signedUpload.objectKey,
      });

      setCropDraft(null);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "อัปโหลดรูปภาพไม่สำเร็จ");
    } finally {
      setUploadBusy(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!selectedProduct) {
      return;
    }

    if (isDraftProduct(selectedProduct)) {
      objectUrlsRef.current = revokeManagedObjectUrl(selectedProduct.imageUrl, objectUrlsRef.current);
      const remaining = products.filter((item) => item.id !== selectedProduct.id);
      setProducts(remaining);
      setSelectedId(remaining[0]?.id ?? "");
      setPage(1);
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
      setPage(1);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "ลบสินค้าไม่สำเร็จ");
    } finally {
      setDeleteBusy(false);
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
        <PageHeader eyebrow="Product Studio" title="สินค้า" actions={<StatusPill tone="success">พร้อมใช้งานแล้ว</StatusPill>} />
      ) : null}

      <div className="grid min-h-0 items-start gap-[12px] [grid-template-columns:minmax(340px,0.96fr)_minmax(0,1.24fr)] max-[1180px]:grid-cols-1">
        <ProductDetailPanel
          compactMode={compactMode}
          productsLoading={productsLoading}
          saveBusy={saveBusy}
          deleteBusy={deleteBusy}
          selectedProduct={selectedProduct}
          onCreateNewProduct={handleCreateNewProduct}
          onUpdateProduct={updateSelectedProduct}
          onSaveChanges={handleSaveChanges}
          onChooseImageClick={handleChooseImageClick}
          onBackToProducts={handleBackToProducts}
          onToggleSaleStatus={handleToggleSaleStatus}
          onResetForm={handleResetForm}
          onDeleteConfirmed={handleDeleteConfirmed}
        />

        <ProductListPanel
          activeCategory={activeCategory}
          currentPage={currentPage}
          filteredCount={filteredProducts.length}
          itemsPerPage={itemsPerPage}
          productsLoading={productsLoading}
          selectedId={selectedId}
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
          onClose={() => {
            if (!uploadBusy) {
              setCropDraft(null);
            }
          }}
          onConfirm={handleCropConfirm}
          onZoomChange={handleCropZoomChange}
          onOffsetChange={handleCropOffsetChange}
        />
      ) : null}
    </div>
  );
}
