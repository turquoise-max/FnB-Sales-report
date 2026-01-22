'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { format, subDays } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function DateRangePicker({
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL에서 초기값 읽기 또는 기본값 (최근 7일) 설정
  const initialFrom = searchParams.get('from') ? new Date(searchParams.get('from')!) : subDays(new Date(), 7);
  const initialTo = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date();

  const [date, setDate] = React.useState<DateRange | undefined>({
    from: initialFrom,
    to: initialTo,
  });

  // 날짜 변경 시 URL 업데이트
  React.useEffect(() => {
    if (date?.from) {
      const fromStr = format(date.from, 'yyyy-MM-dd');
      const toStr = date.to ? format(date.to, 'yyyy-MM-dd') : '';
      
      const currentFrom = searchParams.get('from');
      const currentTo = searchParams.get('to');

      // 현재 URL과 상태가 다를 때만 업데이트 (무한 루프 방지)
      if (fromStr !== currentFrom || (toStr && toStr !== currentTo)) {
        const params = new URLSearchParams(searchParams);
        params.set('from', fromStr);
        
        if (date.to) {
          params.set('to', toStr);
        } else {
          params.delete('to');
        }
        
        router.replace(`${pathname}?${params.toString()}`);
      }
    }
  }, [date, pathname, router, searchParams]);

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-[300px] justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'yyyy-MM-dd')} -{' '}
                  {format(date.to, 'yyyy-MM-dd')}
                </>
              ) : (
                format(date.from, 'yyyy-MM-dd')
              )
            ) : (
              <span>날짜 선택</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
