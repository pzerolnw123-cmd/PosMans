import { useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, PointerEvent } from "react";

export type BillItem = {
  key: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  imageUrl: string | null;
};

export function useBillItemSelection({
  billItems,
  handleBillPointerDown,
  handleBillPointerMove,
  stopBillDrag,
}: {
  billItems: BillItem[];
  handleBillPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  handleBillPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  stopBillDrag: (event: PointerEvent<HTMLDivElement>) => void;
}) {
  const [selectedBillItem, setSelectedBillItem] = useState<BillItem | null>(null);
  const billItemPressRef = useRef<{ key: string; moved: boolean; startX: number; startY: number } | null>(null);
  const lastBillItemDragAtRef = useRef(0);
  const lastBillItemOpenAtRef = useRef(0);

  function openBillItemDetail(item: BillItem) {
    setSelectedBillItem(item);
  }

  function handleBillItemClick(event: MouseEvent<HTMLDivElement>, item: BillItem) {
    if (event.timeStamp - lastBillItemDragAtRef.current < 180 || event.timeStamp - lastBillItemOpenAtRef.current < 250) {
      return;
    }

    lastBillItemOpenAtRef.current = event.timeStamp;
    openBillItemDetail(item);
  }

  function handleBillItemKeyDown(event: KeyboardEvent<HTMLDivElement>, item: BillItem) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openBillItemDetail(item);
  }

  function findPressedBillItem(event: PointerEvent<HTMLDivElement>) {
    if (!(event.target instanceof HTMLElement)) {
      return null;
    }

    const target = event.target.closest<HTMLElement>("[data-bill-item-key]");
    if (!target || !event.currentTarget.contains(target)) {
      return null;
    }

    return billItems.find((item) => item.key === target.dataset.billItemKey) ?? null;
  }

  function handleBillListPointerDown(event: PointerEvent<HTMLDivElement>) {
    const item = findPressedBillItem(event);
    billItemPressRef.current =
      item && event.button === 0
        ? {
            key: item.key,
            moved: false,
            startX: event.clientX,
            startY: event.clientY,
          }
        : null;

    handleBillPointerDown(event);
  }

  function handleBillListPointerMove(event: PointerEvent<HTMLDivElement>) {
    const press = billItemPressRef.current;
    if (press) {
      const distanceX = Math.abs(event.clientX - press.startX);
      const distanceY = Math.abs(event.clientY - press.startY);
      if (distanceX > 8 || distanceY > 8) {
        press.moved = true;
      }
    }

    handleBillPointerMove(event);
  }

  function handleBillListPointerUp(event: PointerEvent<HTMLDivElement>) {
    const press = billItemPressRef.current;
    billItemPressRef.current = null;
    stopBillDrag(event);

    if (press?.moved) {
      lastBillItemDragAtRef.current = event.timeStamp;
      return;
    }

    if (event.pointerType !== "mouse") {
      return;
    }

    const item = press ? billItems.find((billItem) => billItem.key === press.key) : null;
    if (item) {
      lastBillItemOpenAtRef.current = event.timeStamp;
      openBillItemDetail(item);
    }
  }

  function cancelBillListPointer(event: PointerEvent<HTMLDivElement>) {
    if (billItemPressRef.current?.moved) {
      lastBillItemDragAtRef.current = event.timeStamp;
    }
    billItemPressRef.current = null;
    stopBillDrag(event);
  }

  return {
    cancelBillListPointer,
    handleBillItemClick,
    handleBillItemKeyDown,
    handleBillListPointerDown,
    handleBillListPointerMove,
    handleBillListPointerUp,
    selectedBillItem,
    setSelectedBillItem,
  };
}
