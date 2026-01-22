'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { addMultipleManualInputs } from '@/app/actions';
import { Plus, Trash2 } from 'lucide-react';

interface ManualInputRow {
  id: string;
  description: string;
  amount: string;
}

export default function MultiRowInputForm() {
  const [date, setDate] = useState('');
  const [rows, setRows] = useState<ManualInputRow[]>([
    { id: crypto.randomUUID(), description: '', amount: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const addRow = () => {
    setRows([...rows, { id: crypto.randomUUID(), description: '', amount: '' }]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter((row) => row.id !== id));
    }
  };

  const updateRow = (id: string, field: 'description' | 'amount', value: string) => {
    setRows(
      rows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date) {
      setMessage({ type: 'error', text: '날짜를 선택해주세요.' });
      return;
    }

    const validRows = rows.filter((row) => row.description && row.amount);
    if (validRows.length === 0) {
      setMessage({ type: 'error', text: '최소 1개의 항목을 입력해주세요.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('date', date);
    formData.append('rows', JSON.stringify(validRows));

    const result = await addMultipleManualInputs(formData);

    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: result.success! });
      // 성공 시 폼 초기화
      setDate('');
      setRows([{ id: crypto.randomUUID(), description: '', amount: '' }]);
    }

    setLoading(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>영업 외 매출 수기 입력</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="manual-date" className="text-sm font-medium">
              날짜
            </label>
            <Input
              id="manual-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">항목 및 금액</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRow}
                disabled={loading}
              >
                <Plus size={16} className="mr-1" />
                행 추가
              </Button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {rows.map((row, index) => (
                <div key={row.id} className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Input
                      type="text"
                      placeholder="항목명 (예: 케이터링)"
                      value={row.description}
                      onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="금액"
                      value={row.amount}
                      onChange={(e) => updateRow(row.id, 'amount', e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(row.id)}
                    disabled={loading || rows.length === 1}
                  >
                    <Trash2 size={18} className="text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '저장 중...' : `${rows.filter(r => r.description && r.amount).length}개 항목 저장하기`}
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
