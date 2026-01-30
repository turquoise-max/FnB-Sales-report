'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { crawlBaeminData } from '@/app/actions';
import { Truck } from 'lucide-react';

export default function BaeminUpload() {
  const [saleDate, setSaleDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCrawl = async () => {
    if (!saleDate) {
      setMessage({ type: 'error', text: '수집할 날짜를 선택해주세요.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await crawlBaeminData(saleDate);
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
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold">배달의 민족 데이터 가져오기</CardTitle>
        <Truck className="h-5 w-5 text-teal-500" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="baemin-date" className="text-sm font-medium">수집 일자</label>
          <Input
            id="baemin-date"
            type="date"
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
            disabled={loading}
          />
        </div>
        <Button 
          onClick={handleCrawl} 
          className="w-full bg-teal-500 hover:bg-teal-600 text-white" 
          disabled={loading}
        >
          {loading ? '데이터 수집 중 (약 30초 소요)...' : '배민 데이터 수집 및 저장'}
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
