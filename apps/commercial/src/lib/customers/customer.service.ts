import { db } from "@/lib/db";
import type { Customer } from "@prisma/client";

export async function listCustomers() {
  return db.customer.findMany({
    orderBy: { name: "asc" }
  });
}

export async function getCustomer(id: string) {
  return db.customer.findUnique({
    where: { id }
  });
}

export async function upsertCustomer(data: Partial<Customer>) {
  if (data.id) {
    return db.customer.update({
      where: { id: data.id },
      data: {
        name: data.name!,
        email: data.email!,
        phone: data.phone,
        document: data.document,
        type: data.type!,
        active: data.active
      }
    });
  }
  
  return db.customer.create({
    data: {
      name: data.name!,
      email: data.email!,
      phone: data.phone,
      document: data.document,
      type: data.type!,
      active: data.active ?? true
    }
  });
}

export async function deleteCustomer(id: string) {
  return db.customer.delete({
    where: { id }
  });
}
