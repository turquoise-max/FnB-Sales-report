'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { addMultipleManualInputs } from '@/app/actions';
import { Plus, Trash2, HelpCircle, PencilLine } from 'lucide-react';
import HelpModal from '@/components/common/HelpModal';

interface ManualInputRow {
  id: string;
  description: string;
  grossAmount: string;
  netAmount: string;
}

export default function MultiRowInputForm() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [rows, setRows] = useState<ManualInputRow[]>([
    { id: crypto.randomUUID(), description: '', grossAmount: '', netAmount: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const addRow = () => {
    setRows([...rows, { id: crypto.randomUUID(), description: '', grossAmount: '', netAmount: '' }]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter((row) => row.id !== id));
    }
  };

  const updateRow = (id: string, field: keyof ManualInputRow, value: string) => {
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

    const validRows = rows.filter((row) => row.description && (row.grossAmount || row.netAmount));
    if (validRows.length === 0) {
      setMessage({ type: 'error', text: '최소 1개의 항목과 금액을 입력해주세요.' });
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
      setRows([{ id: crypto.randomUUID(), description: '', grossAmount: '', netAmount: '' }]);
    }

    setLoading(false);
  };

  return (
    <Card className="w-full border-none shadow-none bg-transparent">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-0 pt-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-600">
            <PencilLine className="h-5 w-5" />
            기타/수기 매출 입력
          </CardTitle>
          <CardDescription>배달 앱 외의 현금 매출이나 기타 항목을 직접 기록하세요.</CardDescription>
        </div>
        <HelpModal 
          title="기타/수기 매출 입력 방법"
          description="POS 관리자 페이지에서 엑셀 파일을 다운로드하여 업로드하세요."
          steps={[
            {
              title: "기타/수기 매출 항목 입력",
              description: "매출 기준일을 선택하고, 항목명과 총매출 및 실매출 금액을 입력합니다. '행 추가' 버튼을 눌러 여러 항목을 한 번에 입력할 수 있습니다."
            },
            {
              title: "저장하기",
              description: "입력이 완료되면 '저장' 버튼을 클릭하여 데이터를 저장합니다."
            },
            {
              title: "주의사항",
              description: "항목명 오타에 유의하시고, 금액은 숫자만 입력해주세요."
            },
          ]}
        />
      </CardHeader>
      <CardContent className="px-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="manual-date" className="text-sm font-medium">
              매출 기준일
            </label>
            <Input
              id="manual-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={loading}
              className="bg-white"
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
                <div key={row.id} className="flex gap-2 items-start">
                  <div className="flex-[2]">
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
                      placeholder="총매출"
                      value={row.grossAmount}
                      onChange={(e) => updateRow(row.id, 'grossAmount', e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="실매출"
                      value={row.netAmount}
                      onChange={(e) => updateRow(row.id, 'netAmount', e.target.value)}
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
            {loading ? '저장 중...' : `${rows.filter(r => r.description && (r.grossAmount || r.netAmount)).length}개 항목 저장하기`}
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
