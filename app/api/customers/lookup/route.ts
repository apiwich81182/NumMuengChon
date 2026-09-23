import { NextRequest, NextResponse } from "next/server";
import { lookupCustomerByPhone } from "@/actions/customers";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json({ success: true, customer: null });
    }

    const result = await lookupCustomerByPhone(phone);
    return NextResponse.json(result);
  } catch (error) {
    console.error("API customer lookup error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

