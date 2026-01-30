import FileUpload from '@/components/FileUpload';
import MultiRowInputForm from '@/components/MultiRowInputForm';
import BaeminUpload from '@/components/BaeminUpload';
import CoupangUpload from '@/components/CoupangUpload';

export default function DataInputPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">데이터 입력</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* 좌측: 일별 데이터 입력 섹션 */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-2">
            <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
            일별 매출 데이터 수집
          </h2>
          <div className="flex flex-col gap-6">
            <FileUpload />
            <BaeminUpload />
            <MultiRowInputForm />
          </div>
        </div>

        {/* 우측: 월별/기타 데이터 입력 섹션 */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-2">
            <span className="w-1.5 h-6 bg-pink-600 rounded-full"></span>
            월별 정산 데이터 관리
          </h2>
          <div className="flex flex-col gap-6">
            <CoupangUpload />
          </div>
        </div>
      </div>
    </div>
  );
}
