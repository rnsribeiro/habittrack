import { SiteHeader } from "@/components/SiteHeader";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl">{children}</main>
    </>
  );
}
