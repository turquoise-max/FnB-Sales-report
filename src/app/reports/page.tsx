import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangePicker } from '@/components/DateRangePicker';
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
          <DateRangePicker className="w-auto" /> 
          {/* Note: DateRangePicker는 범위를 선택하지만, 리포트는 기준일(종료일) 하나만 필요할 수 있음. 
              여기서는 편의상 DateRangePicker의 'to' 날짜를 기준일로 사용하거나, 
              단일 날짜 선택기(DatePicker)를 별도로 만드는 것이 좋음. 
              일단 기존 DateRangePicker를 활용하되, 로직에서 to 날짜를 우선 사용하도록 함. */}
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
