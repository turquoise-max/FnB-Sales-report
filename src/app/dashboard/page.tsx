import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatePicker } from '@/components/common/DatePicker';
import DailyReport from '@/components/dashboard/DailyReport';
import WeeklyReport from '@/components/dashboard/WeeklyReport';
import MonthlyReport from '@/components/dashboard/MonthlyReport';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedDate = params.date ? new Date(String(params.date)) : new Date();

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">F&B 통합 대시보드</h1>
        <DatePicker date={selectedDate} />
      </div>

      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="daily">일별 분석</TabsTrigger>
          <TabsTrigger value="weekly">주별 분석</TabsTrigger>
          <TabsTrigger value="monthly">월별 분석</TabsTrigger>
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