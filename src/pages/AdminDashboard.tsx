import React from 'react';
import { Navigate } from 'react-router-dom';
import Header from '@/components/dashboard/Header';
import DisclaimerBanner from '@/components/dashboard/DisclaimerBanner';
import ApiCard from '@/components/dashboard/ApiCard';
import ApiForm from '@/components/dashboard/ApiForm';
import ApiImporter from '@/components/dashboard/ApiImporter';
import HitEngine from '@/components/dashboard/HitEngine';
import ApiExportImport from '@/components/dashboard/ApiExportImport';
import LogsPanel from '@/components/dashboard/LogsPanel';
import HitLogsPanel from '@/components/dashboard/HitLogsPanel';
import SiteSettingsPanel from '@/components/dashboard/SiteSettingsPanel';
import PasswordManager from '@/components/dashboard/PasswordManager';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApis } from '@/hooks/useApis';
import { useLogs } from '@/hooks/useLogs';
import { useProxies } from '@/hooks/useProxies';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { Plus, Database, Loader2, LogOut, Code, List, Settings, KeyRound, Link, Copy, Check } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

const AdminDashboard = () => {
  const { apis, loading: apisLoading, addApi, updateApi, deleteApi, toggleApiField, toggleAllApis, bulkImport } = useApis();
  const { logs, addLog, clearLogs } = useLogs();
  const { proxies } = useProxies();
  const { settings } = useSiteSettings();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingApi, setEditingApi] = React.useState<any>(null);
  const [copied, setCopied] = React.useState(false);

  const fastHitUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fast-hit?phone=`;

  const handleCopyFastLink = () => {
    navigator.clipboard.writeText(fastHitUrl);
    setCopied(true);
    toast.success('Fast API link copied!');
    setTimeout(() => setCopied(false), 2000);
  };
  
  const adminAuth = sessionStorage.getItem('adminAuth');

  if (!adminAuth) {
    return <Navigate to="/shubh" replace />;
  }

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuth');
    window.location.href = '/';
  };

  const handleFormSubmit = async (data: any) => {
    const safeJsonParse = <T,>(value: string | undefined, fallback: T): T => {
      try {
        if (!value || !value.trim()) return fallback;
        return JSON.parse(value) as T;
      } catch {
        return fallback;
      }
    };

    const parseFormUrlEncoded = (raw: string): Record<string, string> => {
      // Supports: "a=1&b=2"; keeps "{PHONE}" as-is.
      const params = new URLSearchParams(raw);
      const out: Record<string, string> = {};
      for (const [k, v] of params.entries()) out[k] = v;
      return out;
    };

    try {
      const headers = safeJsonParse<Record<string, string>>(data.headers, {});
      const contentTypeKey = Object.keys(headers).find(k => k.toLowerCase() === 'content-type');
      const contentType = contentTypeKey ? String(headers[contentTypeKey] || '') : '';

      const rawBody = String(data.body ?? '').trim();

      // Body parsing rules (manual form)
      // - If Content-Type is x-www-form-urlencoded, accept either JSON object string or querystring and store as object.
      // - Otherwise default to JSON.
      const isFormUrlEncoded = /application\/x-www-form-urlencoded/i.test(contentType);

      let body: Record<string, unknown> = {};
      let bodyType: 'json' | 'form-urlencoded' | 'multipart' | 'text' | 'none' = 'json';

      if (!rawBody || rawBody === '{}') {
        body = {};
        bodyType = 'none';
      } else if (isFormUrlEncoded) {
        const jsonObj = safeJsonParse<Record<string, unknown>>(rawBody, {});
        if (Object.keys(jsonObj).length > 0) {
          body = jsonObj;
        } else {
          body = parseFormUrlEncoded(rawBody);
        }
        bodyType = 'form-urlencoded';
      } else {
        // JSON body path
        body = safeJsonParse<Record<string, unknown>>(rawBody, {});
        bodyType = 'json';
      }

      const apiData = {
        name: data.name,
        url: data.url,
        method: data.method,
        headers,
        body,
        bodyType,
        query_params: safeJsonParse<Record<string, string>>(data.query_params, {}),
        enabled: data.enabled,
        proxy_enabled: data.proxy_enabled,
        force_proxy: data.force_proxy,
        rotation_enabled: data.rotation_enabled,
      };

      if (data.id) {
        await updateApi(data.id, apiData);
      } else {
        await addApi(apiData);
      }
      setEditingApi(null);
    } catch (e) {
      console.error('Failed to save API:', e);
      toast.error('API add failed — please recheck Headers/Body format.');
    }
  };

  const handleImportApi = async (apiData: {
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
  }) => {
    await addApi(apiData);
  };

  const handleEdit = (api: any) => {
    setEditingApi({
      ...api,
      headers: JSON.stringify(api.headers || {}, null, 2),
      body: JSON.stringify(api.body || {}, null, 2),
      query_params: JSON.stringify(api.query_params || {}, null, 2),
    });
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingApi(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 gradient-matrix pointer-events-none" />
      
      {/* Header */}
      <header className="glass-strong sticky top-0 z-50">
        <div className="container mx-auto px-3 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="w-8 h-8 rounded-xl object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div className="p-1.5 rounded-xl bg-primary/10 border border-primary/15">
                <Database className="w-5 h-5 text-primary" />
              </div>
            )}
            <h1 className="text-base sm:text-xl font-bold text-primary text-glow truncate">{settings.adminPanelTitle}</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}
            className="border-destructive/20 text-destructive hover:bg-destructive/10 text-xs px-2 py-1 rounded-xl">
            <LogOut className="w-3 h-3 sm:mr-1" />
            <span className="hidden sm:inline">{settings.logoutButtonText}</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 space-y-3 sm:space-y-6">
        <DisclaimerBanner />

        {/* Hit Engine */}
        <HitEngine apis={apis} proxies={proxies} onLogCreate={addLog} />

        {/* Fast API Link */}
        <div className="p-3 sm:p-4 glass rounded-xl border border-accent/30 space-y-3">
          <div className="flex items-center gap-2">
            <Link className="w-4 h-4 text-accent" />
            <h3 className="text-sm sm:text-base font-bold text-accent">⚡ Fast API Link</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Ek link se sari enabled APIs fire karo — bas phone number lagao end me.
          </p>
          <div className="flex items-center gap-2">
            <Input 
              readOnly 
              value={fastHitUrl + '9876543210'} 
              className="text-xs bg-background/50 font-mono"
            />
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleCopyFastLink}
              className="border-accent/30 text-accent hover:bg-accent/10 shrink-0"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          {/* Parameters Table */}
          <div className="bg-background/40 rounded-lg border border-border/50 overflow-hidden">
            <table className="w-full text-[10px] sm:text-xs">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Parameter</th>
                  <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Default</th>
                  <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Max</th>
                  <th className="text-left px-2 py-1.5 text-muted-foreground font-medium hidden sm:table-cell">Description</th>
                </tr>
              </thead>
              <tbody className="text-foreground/80">
                <tr className="border-b border-border/30">
                  <td className="px-2 py-1.5 font-mono text-accent">phone</td>
                  <td className="px-2 py-1.5 text-destructive">required</td>
                  <td className="px-2 py-1.5">—</td>
                  <td className="px-2 py-1.5 hidden sm:table-cell">Phone number</td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="px-2 py-1.5 font-mono text-accent">rounds</td>
                  <td className="px-2 py-1.5">1</td>
                  <td className="px-2 py-1.5">50</td>
                  <td className="px-2 py-1.5 hidden sm:table-cell">Kitne rounds chalane hain</td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="px-2 py-1.5 font-mono text-accent">batch</td>
                  <td className="px-2 py-1.5">5</td>
                  <td className="px-2 py-1.5">20</td>
                  <td className="px-2 py-1.5 hidden sm:table-cell">Ek batch me kitni APIs</td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="px-2 py-1.5 font-mono text-accent">delay</td>
                  <td className="px-2 py-1.5">2</td>
                  <td className="px-2 py-1.5">10</td>
                  <td className="px-2 py-1.5 hidden sm:table-cell">Rounds ke beech delay (sec)</td>
                </tr>
                <tr>
                  <td className="px-2 py-1.5 font-mono text-accent">timeout</td>
                  <td className="px-2 py-1.5">15</td>
                  <td className="px-2 py-1.5">—</td>
                  <td className="px-2 py-1.5 hidden sm:table-cell">Per-API timeout (sec)</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Full Example */}
          <div className="bg-background/40 rounded-lg border border-border/50 p-2 sm:p-3 space-y-1.5">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">📋 Full Example:</p>
            <p className="text-[10px] sm:text-xs font-mono text-accent/90 break-all select-all">
              {fastHitUrl}9876543210&rounds=5&batch=5&delay=2&timeout=15
            </p>
            <p className="text-[10px] text-muted-foreground">
              ↑ 5 rounds, 5 APIs per batch, 2s delay between rounds, 15s timeout per API
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="apis" className="space-y-3 sm:space-y-4">
          <TabsList className="glass rounded-xl w-full flex overflow-x-auto p-1">
            <TabsTrigger value="apis" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary flex-1 text-xs sm:text-sm px-2 sm:px-3 rounded-lg">
              <List className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">APIs</span> ({apis.length})
            </TabsTrigger>
            <TabsTrigger value="passwords" className="data-[state=active]:bg-accent/15 data-[state=active]:text-accent flex-1 text-xs sm:text-sm px-2 sm:px-3 rounded-lg">
              <KeyRound className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Passwords</span>
              <span className="sm:hidden">🔑</span>
            </TabsTrigger>
            <TabsTrigger value="import" className="data-[state=active]:bg-secondary/15 data-[state=active]:text-secondary flex-1 text-xs sm:text-sm px-2 sm:px-3 rounded-lg">
              <Code className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Import
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-muted data-[state=active]:text-foreground flex-1 text-xs sm:text-sm px-2 sm:px-3 rounded-lg">
              <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Settings</span>
              <span className="sm:hidden">⚙️</span>
            </TabsTrigger>
          </TabsList>

          {/* APIs Tab */}
          <TabsContent value="apis">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
              {/* APIs Section */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h2 className="text-base sm:text-xl font-bold text-primary text-glow flex items-center gap-2">
                    <Database className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="truncate">{settings.apiListTitle}</span>
                  </h2>
                  <div className="flex items-center gap-2 sm:gap-3">
                    {apis.length > 0 && (
                      <div className="flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-secondary/10 rounded-lg border border-secondary/30">
                        <span className="text-[10px] sm:text-xs text-muted-foreground">All</span>
                        <Switch
                          checked={apis.length > 0 && apis.every(a => a.enabled)}
                          onCheckedChange={(checked) => toggleAllApis(checked)}
                        />
                      </div>
                    )}
                    <Button
                      onClick={() => setFormOpen(true)}
                      size="sm"
                      className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary text-xs sm:text-sm px-2 sm:px-3"
                    >
                      <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      <span className="hidden sm:inline">{settings.addApiButtonText}</span>
                      <span className="sm:hidden">Add</span>
                    </Button>
                  </div>
                </div>

                {apisLoading ? (
                  <div className="flex items-center justify-center py-8 sm:py-12">
                    <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary animate-spin" />
                  </div>
                ) : apis.length === 0 ? (
                  <div className="text-center py-8 sm:py-12 border border-dashed border-primary/30 rounded-lg">
                    <Database className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground mb-2 sm:mb-3" />
                    <p className="text-muted-foreground text-sm">{settings.noApisText}</p>
                    <Button
                      onClick={() => setFormOpen(true)}
                      variant="outline"
                      size="sm"
                      className="mt-3 sm:mt-4 border-primary/50 text-primary text-xs sm:text-sm"
                    >
                      <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      {settings.addApiButtonText}
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:gap-4">
                    {apis.map((api) => (
                      <ApiCard
                        key={api.id}
                        api={api}
                        onToggle={toggleApiField}
                        onEdit={handleEdit}
                        onDelete={deleteApi}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Logs Section */}
              <div className="space-y-3">
                <LogsPanel logs={logs} onClear={clearLogs} />
                <HitLogsPanel />
              </div>
            </div>
          </TabsContent>

          {/* Passwords Tab */}
          <TabsContent value="passwords">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
              <PasswordManager />
              <HitLogsPanel />
            </div>
          </TabsContent>

          {/* Import API Tab */}
          <TabsContent value="import">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
              <div className="space-y-3 sm:space-y-4">
                <ApiImporter onApiAdd={handleImportApi} />
                <ApiExportImport apis={apis} onBulkImport={bulkImport} />
              </div>
              
              {/* Logs Section */}
              <LogsPanel logs={logs} onClear={clearLogs} />
            </div>
          </TabsContent>

          {/* Site Settings Tab */}
          <TabsContent value="settings">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
              <SiteSettingsPanel />
              
              {/* Preview Section */}
              <div className="space-y-3 sm:space-y-4">
                <div className="p-3 sm:p-4 bg-card/50 border border-accent/30 rounded-lg">
                  <h3 className="text-accent font-bold mb-2 text-sm sm:text-base">📱 Preview</h3>
                  <p className="text-xs text-muted-foreground mb-2 sm:mb-3">
                    Changes will reflect instantly on the main page after saving.
                  </p>
                  <div className="p-2 sm:p-3 bg-background/50 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      {settings.logoUrl ? (
                        <img src={settings.logoUrl} alt="Logo" className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
                      ) : (
                        <div className="w-5 h-5 sm:w-6 sm:h-6 bg-primary/20 rounded" />
                      )}
                      <span className="font-bold text-primary text-xs sm:text-sm">{settings.siteName}</span>
                    </div>
                    <p className="text-xs text-warning bg-warning/10 p-2 rounded">{settings.warningText}</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <ApiForm
        open={formOpen}
        onClose={handleCloseForm}
        onSubmit={handleFormSubmit}
        editData={editingApi}
      />
    </div>
  );
};

export default AdminDashboard;
