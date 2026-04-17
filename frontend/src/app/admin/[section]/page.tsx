import { redirect } from "next/navigation";

export default async function AdminSectionRedirectPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  redirect(`/owner/${section}`);
}
