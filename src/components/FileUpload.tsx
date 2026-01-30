'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { uploadExcelData } from '@/app/actions';
import { FileUp } from 'lucide-react';

export default function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [saleDate, setSaleDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage({ type: 'error', text: '파일을 선택해주세요.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('saleDate', saleDate);

    const result = await uploadExcelData(formData);

    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: result.success! });
    }

    setLoading(false);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold">POS 매출 업로드</CardTitle>
        <FileUp className="h-5 w-5 text-slate-500" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="sale-date">매출일자 (파일에 없는 경우)</label>
          <Input
            id="sale-date"
            type="date"
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
            disabled={loading}
          />
        <div className="space-y-2">
          <label htmlFor="file-upload">엑셀 파일</label>
          <Input id="file-upload" type="file" accept=".xlsx, .xls" onChange={handleFileChange} disabled={loading} />
        </div>

        </div>
        <Button onClick={handleUpload} className="w-full" disabled={loading}>
          {loading ? '처리 중...' : '업로드 및 데이터 처리'}
        </Button>
        {message && (
          <p className={`text-sm ${message.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
