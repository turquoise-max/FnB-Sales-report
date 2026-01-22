import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Database, LayoutDashboard, Settings } from 'lucide-react';

export default function Home() {
  const features = [
    {
      title: '데이터 입력',
      description: 'POS 데이터 업로드 및 영업 외 매출 수기 입력',
      icon: Upload,
      href: '/data-input',
    },
    {
      title: '누적 데이터',
      description: '모든 매출 레코드를 다양한 뷰로 확인',
      icon: Database,
      href: '/data-view',
    },
    {
      title: '대시보드',
      description: 'KPI, 차트, 증감률 등 매출 분석',
      icon: LayoutDashboard,
      href: '/dashboard',
    },
    {
      title: '설정',
      description: 'DB 연결, Slack 알림, 테마 설정',
      icon: Settings,
      href: '/settings',
    },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">F&B 매출 관리 대시보드</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            POS 데이터를 통합 관리하고 매출을 시각화하세요
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link key={feature.href} href={feature.href}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <Icon size={32} className="mb-2 text-blue-600" />
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/dashboard"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            대시보드 바로가기 →
          </Link>
        </div>
      </div>
    </main>
  );
}
