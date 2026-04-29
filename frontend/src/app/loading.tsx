import { LoadingState } from "@/components/ui-primitives";

export default function Loading() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <LoadingState
        size={58}
        label="กำลังโหลดหน้า..."
        description="ระบบกำลังเตรียมข้อมูลให้พร้อมใช้งาน"
      />
    </div>
  );
}
