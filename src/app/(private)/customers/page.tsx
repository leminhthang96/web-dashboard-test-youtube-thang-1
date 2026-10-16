"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { auth } from "@/lib/firebase/client"
import { getCustomerColumns } from "@/modules/customers/components/columns"
import { DataTable } from "@/modules/customers/components/data-table"
import {
  createCustomer,
  deleteCustomer,
  getCustomers,
  updateCustomer,
} from "@/modules/customers/services/customer-services"
import { getCustomerErrorMessage } from "@/modules/customers/services/customer-errors"
import type {
  Customer,
  CustomerFormValues,
} from "@/modules/customers/services/types/customer-types"

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)
  const fetching = useRef(false)

  const refreshCustomers = useCallback(async (background = false) => {
    if (background && fetching.current) return
    const currentRequest = ++requestId.current
    fetching.current = true
    if (!background) {
      setLoading(true)
      setError(null)
    }
    try {
      const data = await getCustomers()
      if (currentRequest === requestId.current) {
        setCustomers(data)
        setError(null)
      }
    } catch (error) {
      if (currentRequest === requestId.current) {
        setCustomers([])
        setError(getCustomerErrorMessage(error))
      }
    } finally {
      if (currentRequest === requestId.current) {
        fetching.current = false
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    // Clear the previous account's list whenever Firebase's session changes.
    const unsubscribe = onAuthStateChanged(auth, () => {
      setCustomers([])
      void refreshCustomers()
    })
    return () => {
      unsubscribe()
      requestId.current++
    }
  }, [refreshCustomers])

  useEffect(() => {
    const refreshVisiblePage = () => {
      if (document.visibilityState === "visible" && auth.currentUser) {
        void refreshCustomers(true)
      }
    }
    const timer = window.setInterval(refreshVisiblePage, 15_000)
    window.addEventListener("focus", refreshVisiblePage)
    document.addEventListener("visibilitychange", refreshVisiblePage)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener("focus", refreshVisiblePage)
      document.removeEventListener("visibilitychange", refreshVisiblePage)
    }
  }, [refreshCustomers])

  const handleAddCustomer = useCallback(async (values: CustomerFormValues) => {
    const uid = auth.currentUser?.uid
    const customer = await createCustomer(values)
    if (auth.currentUser?.uid === uid) {
      setCustomers((previous) => [customer, ...previous])
      toast.success("Đã thêm khách hàng.")
    }
  }, [])

  const handleUpdateCustomer = useCallback(
    async (id: string, values: CustomerFormValues) => {
      const uid = auth.currentUser?.uid
      const updated = await updateCustomer(id, values)
      if (auth.currentUser?.uid === uid) {
        setCustomers((previous) =>
          previous.map((customer) =>
            customer.id === id ? { ...customer, ...updated } : customer
          )
        )
        toast.success("Đã cập nhật khách hàng.")
      }
    },
    []
  )

  const handleDeleteCustomer = useCallback(async (id: string) => {
    const uid = auth.currentUser?.uid
    await deleteCustomer(id)
    if (auth.currentUser?.uid === uid) {
      setCustomers((previous) =>
        previous.filter((customer) => customer.id !== id)
      )
      toast.success("Đã xóa khách hàng.")
    }
  }, [])

  const columns = useMemo(
    () =>
      getCustomerColumns({
        onUpdateCustomer: handleUpdateCustomer,
        onDeleteCustomer: handleDeleteCustomer,
      }),
    [handleUpdateCustomer, handleDeleteCustomer]
  )

  return (
    <div className="min-w-0 space-y-6 px-4 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Khách hàng</h1>
          <p className="text-sm text-muted-foreground">
            Quản lý khách hàng đăng ký từ landing page và thêm trên dashboard.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void refreshCustomers()}
          disabled={loading}
        >
          <RefreshCw className="size-4" />
          Tải lại
        </Button>
      </div>
      <Card>
        <CardContent>
          {loading ? (
            <div
              role="status"
              className="flex min-h-48 items-center justify-center gap-2 text-muted-foreground"
            >
              <Loader2 className="size-5 animate-spin" />
              Đang tải khách hàng...
            </div>
          ) : error ? (
            <div role="alert" className="space-y-3 py-8 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void refreshCustomers()}
              >
                Thử lại
              </Button>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={customers}
              onAddCustomer={handleAddCustomer}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
