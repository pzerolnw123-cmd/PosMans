import type { ChangeEvent, Dispatch, RefObject, SetStateAction } from "react";
import { ConfirmDeleteModal } from "@/components/product-management-studio/confirm-delete-modal";
import { CropModal } from "@/components/product-management-studio/crop-modal";
import { ProductDetailPanel } from "@/components/product-management-studio/detail-panel";
import { ProductListPanel } from "@/components/product-management-studio/list-panel";
import type { CropDraft, ProductCategory, ProductItem } from "@/components/product-management-studio/types";
import { PageHeader, StatusPill } from "@/components/ui-primitives";

type ProductManagementStudioLayoutProps = {
  compactMode: boolean;
  productsLoading: boolean;
  saveBusy: boolean;
  deleteBusy: boolean;
  isDirty: boolean;
  selectedProduct: ProductItem | null;
  activeCategory: ProductCategory;
  currentPage: number;
  filteredCount: number;
  itemsPerPage: number;
  selectionTransitionLocked: boolean;
  selectedId: string;
  totalPages: number;
  visibleProducts: ProductItem[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  cropDraft: CropDraft | null;
  cropZoom: number;
  cropOffset: { x: number; y: number };
  uploadBusy: boolean;
  isDeleteModalOpen: boolean;
  onCreateNewProduct: () => void;
  onUpdateProduct: (patch: Partial<ProductItem>) => void;
  onSaveChanges: () => void;
  onChooseImageClick: () => void;
  onBackToProducts: () => void;
  onToggleSaleStatus: () => void;
  onToggleStock: () => void;
  onResetForm: () => void;
  onDeleteConfirmed: () => void;
  onCategoryChange: (category: ProductCategory) => void;
  onPageChange: Dispatch<SetStateAction<number>>;
  onSelectProduct: (id: string) => void;
  onFileSelection: (event: ChangeEvent<HTMLInputElement>) => void;
  onCropClose: () => void;
  onCropConfirm: () => void;
  onCropZoomChange: (nextZoom: number) => void;
  onCropOffsetChange: (nextX: number, nextY: number) => void;
  onCloseDeleteModal: () => void;
  onFinalDelete: () => void;
};

export function ProductManagementStudioLayout({
  compactMode, productsLoading, saveBusy, deleteBusy, isDirty, selectedProduct, activeCategory, currentPage, filteredCount, itemsPerPage, selectionTransitionLocked, selectedId, totalPages, visibleProducts, fileInputRef, cropDraft, cropZoom, cropOffset, uploadBusy, isDeleteModalOpen, onCreateNewProduct, onUpdateProduct, onSaveChanges, onChooseImageClick, onBackToProducts, onToggleSaleStatus, onToggleStock, onResetForm, onDeleteConfirmed, onCategoryChange, onPageChange, onSelectProduct, onFileSelection, onCropClose, onCropConfirm, onCropZoomChange, onCropOffsetChange, onCloseDeleteModal, onFinalDelete,
}: ProductManagementStudioLayoutProps) {
  return (
    <div
      className={
        compactMode
          ? "grid h-auto min-h-0 grid-rows-[auto] gap-[18px]"
          : "grid h-full min-h-0 grid-rows-[156px_minmax(0,1fr)] gap-[18px] max-[1180px]:h-auto max-[1180px]:grid-rows-[auto_auto] max-[820px]:gap-4 [@media(max-height:860px)]:h-auto [@media(max-height:860px)]:grid-rows-[auto_auto]"
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

      <div className="grid min-h-0 items-start gap-[18px] [grid-template-columns:minmax(360px,1fr)_minmax(0,1.3fr)] max-[1366px]:grid-cols-1 max-[820px]:gap-4 max-[420px]:[grid-template-columns:minmax(0,1fr)]">
        <ProductDetailPanel
          compactMode={compactMode}
          productsLoading={productsLoading}
          saveBusy={saveBusy}
          deleteBusy={deleteBusy}
          isDirty={isDirty}
          selectedProduct={selectedProduct}
          onCreateNewProduct={onCreateNewProduct}
          onUpdateProduct={onUpdateProduct}
          onSaveChanges={onSaveChanges}
          onChooseImageClick={onChooseImageClick}
          onBackToProducts={onBackToProducts}
          onToggleSaleStatus={onToggleSaleStatus}
          onToggleStock={onToggleStock}
          onResetForm={onResetForm}
          onDeleteConfirmed={onDeleteConfirmed}
        />

        <ProductListPanel
          activeCategory={activeCategory}
          currentPage={currentPage}
          filteredCount={filteredCount}
          itemsPerPage={itemsPerPage}
          productsLoading={productsLoading}
          selectionTransitionLocked={selectionTransitionLocked}
          selectedId={selectedId}
          totalPages={totalPages}
          visibleProducts={visibleProducts}
          onCategoryChange={onCategoryChange}
          onPageChange={onPageChange}
          onSelectProduct={onSelectProduct}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onFileSelection}
      />

      {cropDraft ? (
        <CropModal
          draft={cropDraft}
          zoom={cropZoom}
          offsetX={cropOffset.x}
          offsetY={cropOffset.y}
          busy={uploadBusy}
          onClose={onCropClose}
          onConfirm={onCropConfirm}
          onZoomChange={onCropZoomChange}
          onOffsetChange={onCropOffsetChange}
        />
      ) : null}

      {isDeleteModalOpen && selectedProduct ? (
        <ConfirmDeleteModal
          product={selectedProduct}
          busy={deleteBusy}
          onClose={onCloseDeleteModal}
          onConfirm={onFinalDelete}
        />
      ) : null}
    </div>
  );
}
