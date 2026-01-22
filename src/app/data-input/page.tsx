import FileUpload from '@/components/FileUpload';
import MultiRowInputForm from '@/components/MultiRowInputForm';

export default function DataInputPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">데이터 입력</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        <FileUpload />
        <MultiRowInputForm />
      </div>
    </div>
  );
}
