import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Upload, FileJson, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Api {
  id: string;
  name: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  bodyType?: 'json' | 'form-urlencoded' | 'multipart' | 'text' | 'none';
  query_params: Record<string, string>;
  enabled: boolean;
  proxy_enabled: boolean;
  force_proxy: boolean;
  rotation_enabled: boolean;
  residential_proxy_enabled?: boolean;
}

interface ApiExportImportProps {
  apis: Api[];
  onBulkImport: (apis: Omit<Api, 'id'>[]) => Promise<void>;
}

const ApiExportImport: React.FC<ApiExportImportProps> = ({ apis, onBulkImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ count: number } | null>(null);

  const handleExport = () => {
    if (apis.length === 0) {
      toast.error('No APIs to export');
      return;
    }

    // Export without id field
    const exportData = apis.map(({ id, ...rest }) => rest);
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apis_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`✅ ${apis.length} APIs exported`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!Array.isArray(data)) {
        toast.error('Invalid JSON: expected an array of APIs');
        setImporting(false);
        return;
      }

      // Validate each API has required fields
      const validApis: Omit<Api, 'id'>[] = data.map((item: any) => ({
        name: item.name || 'Unnamed API',
        url: item.url || '',
        method: item.method || 'GET',
        headers: item.headers || {},
        body: item.body || {},
        bodyType: item.bodyType,
        query_params: item.query_params || {},
        enabled: item.enabled ?? true,
        proxy_enabled: item.proxy_enabled ?? false,
        force_proxy: item.force_proxy ?? true,
        rotation_enabled: item.rotation_enabled ?? false,
        residential_proxy_enabled: item.residential_proxy_enabled ?? false,
      })).filter((api: any) => api.url);

      if (validApis.length === 0) {
        toast.error('No valid APIs found in file');
        setImporting(false);
        return;
      }

      await onBulkImport(validApis);
      setImportResult({ count: validApis.length });
      toast.success(`✅ ${validApis.length} APIs imported!`);
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Invalid JSON file');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="border-accent/30 bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-accent text-sm flex items-center gap-2">
          <FileJson className="w-4 h-4" />
          Export / Import APIs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Export */}
        <Button
          onClick={handleExport}
          variant="outline"
          className="w-full border-primary/30 text-primary hover:bg-primary/10"
          disabled={apis.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Export All APIs ({apis.length})
        </Button>

        {/* Import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="w-full border-secondary/30 text-secondary hover:bg-secondary/10"
          disabled={importing}
        >
          {importing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          {importing ? 'Importing...' : 'Import APIs from JSON'}
        </Button>

        {importResult && (
          <div className="flex items-center gap-2 p-2 bg-success/10 rounded-lg border border-success/30">
            <CheckCircle className="w-4 h-4 text-success" />
            <span className="text-xs text-success">{importResult.count} APIs imported successfully</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ApiExportImport;
