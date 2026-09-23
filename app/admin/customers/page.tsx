import { requireAdminPage } from "@/lib/auth";
import { getCustomers } from "@/actions/customers";
import CustomerDirectoryClient from "./CustomerDirectoryClient";

export const metadata = {
  title: "ฐานข้อมูลลูกค้า | ระบบจัดการรถสูบส้วม",
};

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}

export default async function AdminCustomersPage({ searchParams }: PageProps) {
  await requireAdminPage("/jobs");
  const params = await searchParams;

  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search || "";

  const result = await getCustomers({ page, pageSize: 20, search });

  return (
    <main className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <CustomerDirectoryClient
          initialCustomers={result.customers || []}
          initialTotal={result.total || 0}
          initialTotalPages={result.totalPages || 1}
          currentPage={page}
          searchQuery={search}
        />
      </div>
    </main>
  );
}

