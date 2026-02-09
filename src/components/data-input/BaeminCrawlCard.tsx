'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { crawlBaeminData } from '@/app/actions';
import { CloudDownload } from 'lucide-react';
import HelpModal from '@/components/common/HelpModal';

import { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, subDays } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BaeminUpload() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date()
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCrawl = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      setMessage({ type: 'error', text: '수집할 기간을 선택해주세요.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const startDate = format(dateRange.from, 'yyyy-MM-dd');
      const endDate = format(dateRange.to, 'yyyy-MM-dd');
      const result = await crawlBaeminData(startDate, endDate);
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: result.success! });
      }
    } catch (err) {
      setMessage({ type: 'error', text: '수집 중 예상치 못한 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full border-none shadow-none bg-transparent">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-0 pt-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-teal-600">
            <CloudDownload className="h-5 w-5" />
            배달의민족 자동 수집
          </CardTitle>
          <CardDescription>배민 사장님광장 로그인 후 실시간 주문 내역을 가져옵니다.</CardDescription>
        </div>
        <HelpModal 
          title="배민 데이터 수집 안내"
          description="브라우저가 자동으로 배민 사장님광장에 접속하여 데이터를 수집합니다."
          steps={[
            {
              title: "수집 기간 설정",
              description: "데이터를 수집하고 싶은 시작일과 종료일을 선택합니다."
            },
            {
              title: "자동 수집 시작",
              description: "'수집 시작' 버튼을 클릭하면 서버에서 브라우저가 실행됩니다."
            },
            {
              title: "데이터 가로채기",
              description: "시스템이 자동으로 로그인 후 주문 내역 페이지로 이동하여 데이터를 추출합니다."
            },
            {
              title: "주의사항",
              description: "수집 중에는 창을 닫지 마세요. 주문 건수가 많을 경우 최대 1~2분이 소요될 수 있습니다."
            }
          ]}
        />
      </CardHeader>
      <CardContent className="space-y-4 px-0">
        <div className="space-y-2">
          <label className="text-sm font-medium">수집 기간 선택</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal bg-white h-10",
                  !dateRange && "text-muted-foreground"
                )}
                disabled={loading}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "yyyy-MM-dd")} ~{" "}
                      {format(dateRange.to, "yyyy-MM-dd")}
                    </>
                  ) : (
                    format(dateRange.from, "yyyy-MM-dd")
                  )
                ) : (
                  <span>기간을 선택하세요</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
        <Button 
          onClick={handleCrawl} 
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-12" 
          disabled={loading}
        >
          {loading ? '배민 사장님광장 접속 중...' : '배민 데이터 자동 수집 시작'}
        </Button>
        {message && (
          <p className={`text-sm ${message.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
            {message.text}
          </p>
        )}
        <p className="text-xs text-muted-foreground italic">
          * 클릭 시 브라우저가 실행되어 자동으로 배민 사장님광장에 로그인 후 데이터를 수집합니다.
        </p>
      </CardContent>
    </Card>
  );
}
