"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { upsertCustomer, deleteCustomer } from "@/lib/customers/customer.service";

export async function upsertCustomerAction(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const document = formData.get("document") as string;
  const type = formData.get("type") as string;
  const active = formData.get("active") === "true";

  await upsertCustomer({
    id: id || undefined,
    name,
    email,
    phone,
    document,
    type,
    active
  });

  revalidatePath("/clientes");
}

export async function deleteCustomerAction(id: string) {
  await deleteCustomer(id);
  revalidatePath("/clientes");
}

export async function bulkDeleteCustomersAction(ids: string[]) {
  await db.customer.deleteMany({
    where: { id: { in: ids } }
  });
  revalidatePath("/clientes");
}

export async function searchCustomersAction(query: string) {
  if (!query || query.length < 2) return [];

  return db.customer.findMany({
    where: {
      OR: [
        { name: { contains: query } },
        { email: { contains: query } },
        { document: { contains: query } }
      ],
      active: true
    },
    take: 10,
    select: {
      id: true,
      name: true,
      email: true,
      document: true
    }
  });
}
