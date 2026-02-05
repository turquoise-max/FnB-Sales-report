'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FileUp, HelpCircle, Loader2 } from 'lucide-react';

interface CostUploadCardProps {
  title: string;
  description: string;
  onUpload: (formData: FormData) => Promise<{ success?: string; error?: string }>;
  colorClass?: string;
}

export default function CostUploadCard({ title, description, onUpload, colorClass = "text-blue-600" }: CostUploadCardProps) {
  const [file, setFile] = useState<File | null>(null);
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

    try {
      const result = await onUpload(formData);
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: result.success! });
        setFile(null);
      }
    } catch (err) {
      setMessage({ type: 'error', text: '처리 중 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full border-none shadow-none bg-transparent">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-0 pt-0 pb-4">
        <div className="space-y-1">
          <CardTitle className={`text-xl font-bold flex items-center gap-2 ${colorClass}`}>
            <FileUp className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button variant="ghost" size="icon" className="text-slate-400" title="도움말 보기">
          <HelpCircle className="h-5 w-5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 px-0">
        <div className="space-y-2">
          <label className="text-sm font-medium">엑셀 파일 선택</label>
          <Input 
            type="file" 
            accept=".xlsx, .xls" 
            onChange={handleFileChange} 
            disabled={loading} 
            className="bg-white cursor-pointer" 
          />
        </div>
        <Button 
          onClick={handleUpload} 
          className={`w-full ${colorClass.replace('text-', 'bg-')} hover:brightness-90 text-white font-bold h-12`} 
          disabled={loading || !file}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              처리 중...
            </>
          ) : (
            '업로드 및 데이터 처리'
          )}
        </Button>
        {message && (
          <p className={`text-sm font-medium text-center ${message.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}