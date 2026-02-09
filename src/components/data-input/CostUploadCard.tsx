'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FileUp, Loader2 } from 'lucide-react';
import HelpModal from '@/components/common/HelpModal';

interface CostUploadCardProps {
  title: string;
  description: string;
  onUpload: (formData: FormData) => Promise<{ success?: string; error?: string }>;
  templateUrl?: string; // 템플릿 다운로드 링크 추가
  colorClass?: string;
}

export default function CostUploadCard({ title, description, onUpload, templateUrl, colorClass = "text-blue-600" }: CostUploadCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(Date.now()); // 파일 입력을 초기화하기 위한 키
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
        setInputKey(Date.now()); // 파일 입력 초기화
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
        <HelpModal 
          title={`${title} 안내`}
          description="제공된 표준 양식(CSV)에 맞춰 데이터를 작성 후 업로드하세요."
          steps={[
            {
              title: "양식 다운로드",
              description: "업로드 버튼 상단의 '양식 다운로드' 링크를 클릭하여 파일을 받습니다."
            },
            {
              title: "데이터 작성",
              description: "엑셀이나 메모장에서 첫 줄(헤더)을 유지한 채 데이터를 입력합니다. 날짜 형식(YYYY-MM-DD)을 꼭 지켜주세요."
            },
            {
              title: "파일 저장",
              description: "작성이 완료되면 CSV 또는 XLSX 형식으로 저장합니다."
            },
            {
              title: "데이터 덮어쓰기 안내",
              description: "이미 같은 달의 데이터가 있을 경우, 새로 업로드한 파일의 내용으로 해당 월의 전체 데이터가 교체됩니다."
            }
          ]}
        />
      </CardHeader>
      <CardContent className="space-y-4 px-0">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">엑셀 파일 선택</label>
            {templateUrl && (
              <a 
                href={templateUrl} 
                download 
                className="text-xs text-blue-500 hover:underline flex items-center gap-1"
              >
                양식 다운로드
              </a>
            )}
          </div>
          <Input 
            key={inputKey}
            type="file" 
            accept=".xlsx, .xls, .csv" 
            onChange={handleFileChange} 
            disabled={loading} 
            className="bg-white cursor-pointer" 
          />
        </div>
        <Button 
          onClick={handleUpload} 
          className={`w-full text-white font-bold h-12 ${
            colorClass === 'text-orange-600' ? 'bg-orange-600 hover:bg-orange-700' : 
            colorClass === 'text-purple-600' ? 'bg-purple-600 hover:bg-purple-700' : 
            'bg-blue-600 hover:bg-blue-700'
          }`} 
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