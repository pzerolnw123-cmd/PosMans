import Image from "next/image";
import { LoadingState } from "@/components/ui-primitives";

export default function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="grid justify-items-center gap-5">
        <Image src="/logo.png" alt="POS MANS" width={488} height={111} priority className="h-auto w-[min(158px,52vw)]" />
        <LoadingState
          size={58}
          label="กำลังโหลดหน้า..."
          description="ระบบกำลังเตรียมข้อมูลให้พร้อมใช้งาน"
        />
      </div>
    </div>
  );
}
