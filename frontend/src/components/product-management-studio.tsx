"use client";

import { useEffect, useState } from "react";

type ProductCategory = "ทั้งหมด" | "อาหาร" | "เครื่องดื่ม" | "เบเกอรี";

type ProductItem = {
  id: string;
  code: string;
  name: string;
  category: Exclude<ProductCategory, "ทั้งหมด">;
  price: number;
  status: "พร้อมขาย" | "ใกล้หมด";
  accentClass: string;
  illustration: string;
};

const initialProducts: ProductItem[] = [
  {
    id: "food-002",
    code: "FOOD-002",
    name: "ขนมจีนน้ำยาป่า",
    category: "อาหาร",
    price: 52,
    status: "พร้อมขาย",
    accentClass: "is-noodle",
    illustration: "ข",
  },
  {
    id: "food-003",
    code: "FOOD-003",
    name: "ทอดมันกุ้ง",
    category: "อาหาร",
    price: 60,
    status: "พร้อมขาย",
    accentClass: "is-fried",
    illustration: "ท",
  },
  {
    id: "bakery-002",
    code: "BAKERY-002",
    name: "ไข่หวาน",
    category: "เบเกอรี",
    price: 45,
    status: "พร้อมขาย",
    accentClass: "is-bakery",
    illustration: "ไข่",
  },
  {
    id: "bakery-001",
    code: "BAKERY-001",
    name: "ขนมครก",
    category: "เบเกอรี",
    price: 54,
    status: "พร้อมขาย",
    accentClass: "is-dessert",
    illustration: "ขค",
  },
  {
    id: "drink-001",
    code: "DRINK-001",
    name: "ชาไทยเย็น",
    category: "เครื่องดื่ม",
    price: 55,
    status: "ใกล้หมด",
    accentClass: "is-drink",
    illustration: "ชา",
  },
];

function makeNewProduct(): ProductItem {
  return {
    id: "draft-product",
    code: "DRAFT-NEW",
    name: "สินค้าใหม่",
    category: "อาหาร",
    price: 0,
    status: "พร้อมขาย",
    accentClass: "is-noodle",
    illustration: "ใหม่",
  };
}

function formatPrice(value: number) {
  return `THB ${value}`;
}

export function ProductManagementStudio() {
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [activeCategory, setActiveCategory] = useState<ProductCategory>("ทั้งหมด");
  const [selectedId, setSelectedId] = useState(initialProducts[0].id);
  const [page, setPage] = useState(1);
  const [compactMode, setCompactMode] = useState(false);
  const itemsPerPage = compactMode ? 3 : 4;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1181px) and (max-height: 860px)");
    const syncCompactMode = () => setCompactMode(mediaQuery.matches);

    syncCompactMode();
    mediaQuery.addEventListener("change", syncCompactMode);

    return () => mediaQuery.removeEventListener("change", syncCompactMode);
  }, []);

  const selectedProduct = products.find((item) => item.id === selectedId) || products[0];
  const filteredProducts =
    activeCategory === "ทั้งหมด" ? products : products.filter((item) => item.category === activeCategory);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const currentPage = Math.min(page, totalPages);
  const visibleProducts = {
    total: filteredProducts.length,
    items: filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    totalPages,
  };

  function updateSelectedProduct(patch: Partial<ProductItem>) {
    setProducts((current) =>
      current.map((item) => (item.id === selectedId ? { ...item, ...patch } : item)),
    );
  }

  function handleCategoryChange(category: ProductCategory) {
    setActiveCategory(category);
    setPage(1);
  }

  function handleCreateNewProduct() {
    const next = makeNewProduct();
    setProducts((current) => [next, ...current]);
    setSelectedId(next.id);
    setActiveCategory("ทั้งหมด");
    setPage(1);
  }

  function handleDeleteSelected() {
    if (!selectedProduct) return;

    const remaining = products.filter((item) => item.id !== selectedProduct.id);
    setProducts(remaining);
    if (remaining.length > 0) {
      setSelectedId(remaining[0].id);
    }
  }

  return (
    <div className={compactMode ? "product-studio is-compact" : "product-studio"}>
      <section className="panel-card product-hero-card">
        <div className="panel-header">
          <div>
            <p className="eyebrow-label">หน้าจัดการสินค้า</p>
            <h2>จัดการสินค้า</h2>
            <p>เพิ่ม ลบ แก้ไขราคา ประเภท และรูปภาพสินค้าในหน้าจอเดียว โดยแยกมุมมองให้กระชับและดูแลง่ายขึ้น</p>
          </div>
          <div className="panel-actions">
            <span className="success-pill">พร้อมใช้งานแล้ว</span>
            <button type="button" className="primary-button" onClick={handleCreateNewProduct}>
              เพิ่มสินค้าใหม่
            </button>
          </div>
        </div>
      </section>

      <div className="product-management-layout">
        <section className="panel-card product-editor-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow-label">รายละเอียดสินค้า</p>
              <h2>แก้ไขสินค้า</h2>
            </div>
            <span className="ghost-pill">โหมดแก้ไข</span>
          </div>

          <div className="product-editor-scroll">
            <div className={`product-preview-banner ${selectedProduct.accentClass}`}>
              <div className="product-preview-overlay">
                <div className="product-preview-frame">
                  <div className={`product-thumb-hero ${selectedProduct.accentClass}`}>
                    <span>{selectedProduct.illustration}</span>
                  </div>
                  <div>
                    <strong>{selectedProduct.name}</strong>
                    <p>{selectedProduct.category}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="dense-grid product-editor-form">
              <label className="field-row">
                <span>ชื่อสินค้า</span>
                <input
                  className="app-input"
                  value={selectedProduct.name}
                  onChange={(event) => updateSelectedProduct({ name: event.target.value })}
                />
              </label>

              <label className="field-row">
                <span>ประเภทสินค้า</span>
                <select
                  className="app-input"
                  value={selectedProduct.category}
                  onChange={(event) =>
                    updateSelectedProduct({ category: event.target.value as ProductItem["category"] })
                  }
                >
                  <option value="อาหาร">อาหาร</option>
                  <option value="เครื่องดื่ม">เครื่องดื่ม</option>
                  <option value="เบเกอรี">เบเกอรี</option>
                </select>
              </label>

              <div className="dense-grid two-up product-form-split">
                <div className="product-price-stack">
                  <label className="field-row">
                    <span>ราคา</span>
                    <input
                      className="app-input"
                      type="number"
                      value={selectedProduct.price}
                      onChange={(event) => updateSelectedProduct({ price: Number(event.target.value || 0) })}
                    />
                  </label>

                  <button
                    type="button"
                    className="primary-button product-save-button"
                    style={{ marginTop: compactMode ? 10 : 12 }}
                  >
                    บันทึกการเปลี่ยนแปลง
                  </button>
                </div>

                <div className="product-upload-card">
                  <span className="form-caption">รูปภาพสินค้า</span>
                  <p>{compactMode ? "JPG, PNG, WEBP ไม่เกิน 5 MB" : "รูปแบบไฟล์ที่รองรับ JPG, PNG, WEBP และขนาดไม่เกิน 5 MB"}</p>
                  <button type="button" className="secondary-button">
                    เลือกรูปภาพใหม่
                  </button>
                </div>
              </div>
            </div>

            <div className="product-editor-actions">
              <button type="button" className="ghost-button">
                เคลียร์ฟอร์ม
              </button>
              <button type="button" className="secondary-button">
                ปิดขาย
              </button>
              <button type="button" className="ghost-button">
                ย้อนกลับ
              </button>
              <button type="button" className="danger-button" onClick={handleDeleteSelected}>
                ลบสินค้านี้
              </button>
            </div>
          </div>
        </section>

        <section className="panel-card product-list-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow-label">รายการสินค้าทั้งหมด</p>
              <h2>เลือกสินค้าเพื่อแก้ไขได้ทันที</h2>
            </div>
            <div className="panel-actions">
              <span className="ghost-pill">หน้า {currentPage}/{visibleProducts.totalPages}</span>
              <span className="ghost-pill">{visibleProducts.total} รายการ</span>
            </div>
          </div>

          <div className="product-list-scroll">
            <div className="product-category-tabs">
              {(["ทั้งหมด", "อาหาร", "เครื่องดื่ม", "เบเกอรี"] as ProductCategory[]).map((category) => (
                <button
                  key={category}
                  type="button"
                  className={activeCategory === category ? "category-tab is-active" : "category-tab"}
                  onClick={() => handleCategoryChange(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="product-list-stack">
              {visibleProducts.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={item.id === selectedId ? "product-list-item is-selected" : "product-list-item"}
                  onClick={() => setSelectedId(item.id)}
                >
                  <div className={`product-thumb ${item.accentClass}`}>
                    <span>{item.illustration}</span>
                  </div>

                  <div className="product-list-meta">
                    <strong>{item.name}</strong>
                    <div className="product-list-subline">
                      <span>{item.category}</span>
                      <span className={item.status === "พร้อมขาย" ? "success-pill" : "ghost-pill"}>{item.status}</span>
                    </div>
                    <p>{item.code}</p>
                  </div>

                  <div className="product-list-price">{formatPrice(item.price)}</div>
                </button>
              ))}
            </div>

            <div className="product-list-footer">
              <button
                type="button"
                className="ghost-button"
                disabled={currentPage <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                ก่อนหน้า
              </button>
              <span className="muted-text">แสดงสูงสุด {itemsPerPage} สินค้าต่อหน้า</span>
              <button
                type="button"
                className="secondary-button"
                disabled={currentPage >= visibleProducts.totalPages}
                onClick={() => setPage((current) => Math.min(visibleProducts.totalPages, current + 1))}
              >
                ถัดไป
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
