import { requireUserPage } from "@/lib/auth";
import ExpenseFormClient from "./ExpenseFormClient";
import { getActiveVehicles } from "@/lib/vehicle-service";

export const revalidate = 0;

export default async function NewExpensePage() {
  const currentUser = await requireUserPage("/login");

  // ดึงรายการรถจาก Database ฝั่ง Server
  const vehicles = await getActiveVehicles();

  return (
    <ExpenseFormClient
      vehicles={vehicles}
      isAdmin={currentUser.role === "ADMIN"}
    />
  );
}