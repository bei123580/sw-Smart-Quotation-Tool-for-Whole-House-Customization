import { QuotationShell } from "@/components/quotation-shell";

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.18),_transparent_48%),linear-gradient(180deg,_#f8fafc_0%,_#e2e8f0_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <QuotationShell />
    </main>
  );
}
