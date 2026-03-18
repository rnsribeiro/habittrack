import { SiteHeader } from "@/components/SiteHeader";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pb-12 pt-6">{children}</main>
    </>
  );
}
