import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FileUpload from '@/components/data-input/PosUploadCard';
import BaeminUpload from '@/components/data-input/BaeminCrawlCard';
import CoupangUpload from '@/components/data-input/CoupangUploadCard';
import MultiRowInputForm from '@/components/data-input/ManualSalesForm';
import KpiTargetForm from '@/components/data-input/KpiTargetForm';
import CostUploadCard from '@/components/data-input/CostUploadCard';
import { uploadMaterialCosts, uploadSgaCosts } from '@/app/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DataInputPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">데이터 입력 및 관리</h1>
      
      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="sales">매출</TabsTrigger>
          <TabsTrigger value="material">매출원가</TabsTrigger>
          <TabsTrigger value="sg_and_a">판관비</TabsTrigger>
          <TabsTrigger value="kpi">KPI</TabsTrigger>
        </TabsList>

        {/* 매출 탭 */}
        <TabsContent value="sales">
          <div className="flex flex-col md:flex-row gap-0 min-h-[600px] bg-white rounded-2xl border shadow-sm overflow-hidden">
            {/* 좌측: 일별 매출 입력 섹션 */}
            <section className="flex-1 p-6 space-y-8">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 pb-2 border-b">
                <span className="w-1.5 h-5 bg-blue-600 rounded-full"></span>
                일별 매출 입력
              </h2>
              <div className="space-y-10 max-w-md mx-auto">
                <FileUpload />
                <BaeminUpload />
                <MultiRowInputForm />
              </div>
            </section>

            {/* 중앙 구분선 */}
            <div className="hidden md:block w-px bg-slate-100 self-stretch"></div>

            {/* 우측: 월별 정산 입력 섹션 */}
            <section className="flex-1 p-6 bg-slate-50/50 space-y-8">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 pb-2 border-b">
                <span className="w-1.5 h-5 bg-pink-600 rounded-full"></span>
                월별 정산 입력
              </h2>
              <div className="max-w-md mx-auto">
                <CoupangUpload />
              </div>
            </section>
          </div>
        </TabsContent>

        {/* 매출원가 탭 */}
        <TabsContent value="material">
          <div className="max-w-2xl mx-auto py-10">
            <div className="p-8 bg-white rounded-2xl border shadow-sm">
              <CostUploadCard 
                title="매출원가(재료비) 업로드"
                description="식자재 및 부재료 매입 내역 엑셀 파일을 업로드하세요."
                onUpload={uploadMaterialCosts}
                templateUrl="/templates/material_cost_template.csv"
                colorClass="text-orange-600"
              />
            </div>
          </div>
        </TabsContent>

        {/* 판관비 탭 */}
        <TabsContent value="sg_and_a">
          <div className="max-w-2xl mx-auto py-10">
            <div className="p-8 bg-white rounded-2xl border shadow-sm">
              <CostUploadCard 
                title="판관비(운영비) 업로드"
                description="임대료, 인건비, 공과금 등 운영 비용 엑셀 파일을 업로드하세요."
                onUpload={uploadSgaCosts}
                templateUrl="/templates/sga_cost_template.csv"
                colorClass="text-purple-600"
              />
            </div>
          </div>
        </TabsContent>

        {/* KPI 탭 */}
        <TabsContent value="kpi">
          <div className="max-w-2xl mx-auto py-10">
            <div className="p-8 bg-white rounded-2xl border shadow-sm">
              <KpiTargetForm />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}