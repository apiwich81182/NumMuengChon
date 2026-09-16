import { revalidatePath } from "next/cache";

export function revalidateJobs() {
  revalidatePath("/jobs");
  revalidatePath("/admin/dashboard");
}

export function revalidateExpenses() {
  revalidatePath("/expenses");
  revalidatePath("/admin/dashboard");
}

export function revalidateAttendance() {
  revalidatePath("/attendance");
  revalidatePath("/admin/attendance");
  revalidatePath("/admin/dashboard");
}

export function revalidateVehicles() {
  revalidatePath("/admin/vehicles");
  revalidatePath("/admin/dashboard");
  revalidatePath("/jobs/new");
}

export function revalidateStaff() {
  revalidatePath("/admin/staff");
  revalidatePath("/jobs/new");
}
