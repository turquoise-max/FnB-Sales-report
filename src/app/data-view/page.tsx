import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getAllSalesRecords,
  getAllDailySummaries,
  getItemSummary,
} from '@/lib/services/dashboard-data';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/common/DateRangePicker';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DataViewPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const startDate = typeof params.from === 'string' ? params.from : undefined;
  const endDate = typeof params.to === 'string' ? params.to : undefined;

  const allRecords = await getAllSalesRecords(startDate, endDate);
  const dailySummaries = await getAllDailySummaries(startDate, endDate);
  const itemSummary = await getItemSummary(startDate, endDate);

  const formatCurrency = (amount: any) => {
    const val = typeof amount === 'number' ? amount : parseInt(String(amount), 10);
    if (isNaN(val)) return '0';
    return new Intl.NumberFormat('ko-KR').format(val);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR');
  };

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">누적 데이터 확인</h1>
        <DateRangePicker />
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">전체 레코드</TabsTrigger>
          <TabsTrigger value="daily">일별 요약</TabsTrigger>
          <TabsTrigger value="item">상품별</TabsTrigger>
        </TabsList>

        {/* 전체 레코드 뷰 */}
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>전체 주문 내역 ({allRecords.length}건)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>주문 일시</TableHead>
                      <TableHead>주문 번호</TableHead>
                      <TableHead>채널</TableHead>
                      <TableHead className="text-right">총 결제액</TableHead>
                      <TableHead className="text-right">실 매출액</TableHead>
                      <TableHead className="text-center">상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <span>{new Date(record.order_at).toLocaleString('ko-KR')}</span>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{record.order_number}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            record.channel === 'BAEMIN' ? 'bg-teal-100 text-teal-800' :
                            record.channel === 'COUPANG' ? 'bg-pink-100 text-pink-800' :
                            record.channel === 'POS' ? 'bg-blue-100 text-blue-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {record.channel}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">₩{formatCurrency(record.gross_amount)}</TableCell>
                        <TableCell className={`text-right font-bold ${record.is_refund ? 'text-red-500' : 'text-blue-600'}`}>
                          ₩{formatCurrency(record.net_amount)}
                        </TableCell>
                        <TableCell className="text-center">
                          {record.is_refund && (
                            <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                              반품
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 일별 요약 뷰 */}
        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle>일별 채널별 분석 ({dailySummaries.length}일)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">날짜</TableHead>
                      <TableHead className="text-right min-w-[150px]">전체 합계 (실/총)</TableHead>
                      <TableHead className="text-right min-w-[120px]">POS (실/총)</TableHead>
                      <TableHead className="text-right min-w-[120px]">배민 (실/총)</TableHead>
                      <TableHead className="text-right min-w-[120px]">쿠팡 (실/총)</TableHead>
                      <TableHead className="text-right min-w-[120px]">수기 (실/총)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailySummaries.map((summary) => (
                      <TableRow key={summary.sale_date}>
                        <TableCell className="font-medium">{formatDate(summary.sale_date)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col">
                            <span className="font-bold text-blue-600 text-sm">₩{formatCurrency(summary.total_sales)}</span>
                            <span className="text-[10px] text-gray-400 font-normal">₩{formatCurrency(summary.total_gross)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold">₩{formatCurrency(summary.pos_sales)}</span>
                            <span className="text-[10px] text-gray-400">₩{formatCurrency(summary.pos_gross)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-teal-600">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold">₩{formatCurrency(summary.baemin_sales)}</span>
                            <span className="text-[10px] text-teal-400 opacity-70">₩{formatCurrency(summary.baemin_gross)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-pink-600">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold">₩{formatCurrency(summary.coupang_sales)}</span>
                            <span className="text-[10px] text-pink-400 opacity-70">₩{formatCurrency(summary.coupang_gross)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-amber-600">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold">₩{formatCurrency(summary.manual_sales)}</span>
                            <span className="text-[10px] text-amber-400 opacity-70">₩{formatCurrency(summary.manual_gross)}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        {/* 상품별 집계 뷰 */}
        <TabsContent value="item">
          <Card>
            <CardHeader>
              <CardTitle>상품별 집계 ({itemSummary.length}개)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>상품명</TableHead>
                      <TableHead className="text-right">총 판매량</TableHead>
                      <TableHead className="text-right">총 매출액</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemSummary.map((item) => (
                      <TableRow key={item.itemName}>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell className="text-right">{item.totalQuantity}개</TableCell>
                        <TableCell className="text-right font-semibold">₩{formatCurrency(item.totalSales)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
