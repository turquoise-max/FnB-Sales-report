import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getAllSalesRecords,
  getAllDailySummaries,
  getItemSummary,
} from '@/lib/dashboard-data';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/DateRangePicker';

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
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
              <CardTitle>전체 매출 레코드 ({allRecords.length}건)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>날짜/시간</TableHead>
                      <TableHead>영수증번호</TableHead>
                      <TableHead>상품명</TableHead>
                      <TableHead className="text-right">수량</TableHead>
                      <TableHead className="text-right">총매출액</TableHead>
                      <TableHead className="text-right">할인액</TableHead>
                      <TableHead className="text-right">실매출액</TableHead>
                      <TableHead className="text-center">상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{formatDate(record.sale_date)}</span>
                            <span className="text-xs text-gray-500">{record.payment_time}</span>
                          </div>
                        </TableCell>
                        <TableCell>{record.receipt_number || '-'}</TableCell>
                        <TableCell>{record.item_name}</TableCell>
                        <TableCell className="text-right">{record.quantity}</TableCell>
                        <TableCell className="text-right">₩{formatCurrency(record.total_amount)}</TableCell>
                        <TableCell className="text-right">₩{formatCurrency(record.discount_amount)}</TableCell>
                        <TableCell className={`text-right font-semibold ${record.is_refund ? 'text-red-500' : ''}`}>
                          ₩{formatCurrency(record.net_amount)}
                        </TableCell>
                        <TableCell className="text-center">
                          {record.is_refund ? (
                            <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              반품
                            </span>
                          ) : (
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                record.source === 'POS'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              }`}
                            >
                              {record.source}
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
              <CardTitle>일별 매출 요약 ({dailySummaries.length}일)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>날짜</TableHead>
                      <TableHead className="text-right">총 매출</TableHead>
                      <TableHead className="text-right">POS 매출</TableHead>
                      <TableHead className="text-right">수기 매출</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailySummaries.map((summary) => (
                      <TableRow key={summary.sale_date}>
                        <TableCell className="font-medium">{formatDate(summary.sale_date)}</TableCell>
                        <TableCell className="text-right font-semibold">₩{formatCurrency(summary.total_sales)}</TableCell>
                        <TableCell className="text-right">₩{formatCurrency(summary.pos_sales)}</TableCell>
                        <TableCell className="text-right">₩{formatCurrency(summary.manual_sales)}</TableCell>
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
