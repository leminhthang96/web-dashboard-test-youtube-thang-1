import Link from "next/link"
import { FileText, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardThreePage() {
  return (
    <div className="space-y-6 px-4 md:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard 3</h1>
        <p className="mt-2 text-muted-foreground">Tổng quan báo cáo</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="size-5" /> Chưa có báo cáo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Trang này chưa có dữ liệu báo cáo. Bạn có thể xem tài liệu ISO trong
            thời gian chờ bổ sung nội dung.
          </p>
          <Button asChild variant="outline">
            <Link href="/documents">
              <FileText className="size-4" />
              ISO Documents
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
