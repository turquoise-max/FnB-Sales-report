'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { addManualInput } from '@/app/actions';

export default function ManualInputForm() {
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !description || !amount) {
      setMessage({ type: 'error', text: '모든 필드를 입력해주세요.' });
      return;
    }
    
    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('date', date);
    formData.append('description', description);
    formData.append('amount', amount);

    const result = await addManualInput(formData);

    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: result.success! });
      // 성공 시 폼 초기화
      setDate('');
      setDescription('');
      setAmount('');
    }

    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>영업 외 매출 수기 입력</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="manual-date">날짜</label>
            <Input id="manual-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={loading} />
          </div>
          <div className="space-y-2">
            <label htmlFor="description">항목명</label>
            <Input id="description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="예: 배달 수수료 정산" disabled={loading} />
          </div>
          <div className="space-y-2">
            <label htmlFor="amount">금액</label>
            <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="숫자만 입력" disabled={loading} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '저장 중...' : '저장하기'}
          </Button>
          {message && (
            <p className={`text-sm ${message.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
              {message.text}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
