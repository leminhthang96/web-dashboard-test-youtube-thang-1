import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocsFromServer,
  query,
  updateDoc,
  where,
} from "firebase/firestore"

import { auth, db } from "@/lib/firebase/client"
import {
  customerFormSchema,
  customerSchema,
  type Customer,
  type CustomerFormValues,
} from "./types/customer-types"

const CUSTOMERS_COLLECTION = "customers"

async function getCurrentUserId(): Promise<string> {
  await auth.authStateReady()
  // Read the current user each time; never cache a previous login.
  const user = auth.currentUser
  if (!user) {
    throw new Error("Vui lòng đăng nhập để quản lý khách hàng.")
  }
  return user.uid
}

export async function getCustomers(): Promise<Customer[]> {
  const userId = await getCurrentUserId()
  const snapshot = await getDocsFromServer(
    query(collection(db, CUSTOMERS_COLLECTION), where("userId", "==", userId))
  )
  return snapshot.docs.map((document) => {
    const parsed = customerSchema.safeParse({
      ...document.data(),
      id: document.id,
    })
    if (!parsed.success) {
      throw new Error(
        "Dữ liệu khách hàng không hợp lệ. Vui lòng kiểm tra các trường họ tên, email, số điện thoại và dịch vụ trong Firestore."
      )
    }
    return parsed.data
  })
}

export async function createCustomer(
  values: CustomerFormValues
): Promise<Customer> {
  const userId = await getCurrentUserId()
  const payload = { ...customerFormSchema.parse(values), userId }
  const document = await addDoc(collection(db, CUSTOMERS_COLLECTION), payload)
  return { ...payload, id: document.id }
}

export async function updateCustomer(
  customerId: string,
  values: CustomerFormValues
): Promise<CustomerFormValues> {
  await getCurrentUserId()
  const payload = customerFormSchema.parse(values)
  // Only edit business fields; preserve owner and legacy metadata.
  // Firestore Rules enforce ownership for this write.
  await updateDoc(doc(db, CUSTOMERS_COLLECTION, customerId), payload)
  return payload
}

export async function deleteCustomer(customerId: string): Promise<void> {
  await getCurrentUserId()
  await deleteDoc(doc(db, CUSTOMERS_COLLECTION, customerId))
}
