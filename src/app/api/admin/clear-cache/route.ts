import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function GET() {
  try {
    revalidatePath("/", "layout");
    revalidatePath("/dashboard", "layout");
    return NextResponse.json({ message: "Cache cleared!" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
