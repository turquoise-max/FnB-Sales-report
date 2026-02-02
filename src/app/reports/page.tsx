import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatePicker } from '@/components/DatePicker';
import DailyReport from '@/components/reports/DailyReport';
import WeeklyReport from '@/components/reports/WeeklyReport';
import MonthlyReport from '@/components/reports/MonthlyReport';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  // 선택된 날짜 (없으면 오늘)
  const selectedDate = params.date ? new Date(String(params.date)) : new Date();

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">보고서 미리보기</h1>
        <div className="flex items-center gap-4">
          <DatePicker date={selectedDate} />
        </div>
      </div>

      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="daily">일일 리포트</TabsTrigger>
          <TabsTrigger value="weekly">주간 리포트</TabsTrigger>
          <TabsTrigger value="monthly">월간 리포트</TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <DailyReport date={selectedDate} />
        </TabsContent>

        <TabsContent value="weekly">
          <WeeklyReport date={selectedDate} />
        </TabsContent>

        <TabsContent value="monthly">
          <MonthlyReport date={selectedDate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
