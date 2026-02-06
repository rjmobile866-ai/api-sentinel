import React from 'react';
import { Navigate } from 'react-router-dom';
import Header from '@/components/dashboard/Header';
import DisclaimerBanner from '@/components/dashboard/DisclaimerBanner';
import ApiCard from '@/components/dashboard/ApiCard';
import ApiForm from '@/components/dashboard/ApiForm';
import ApiImporter from '@/components/dashboard/ApiImporter';
import HitEngine from '@/components/dashboard/HitEngine';
import LogsPanel from '@/components/dashboard/LogsPanel';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApis } from '@/hooks/useApis';
import { useLogs } from '@/hooks/useLogs';
import { useProxies } from '@/hooks/useProxies';
import { Plus, Database, Loader2, LogOut, Code, List } from 'lucide-react';

const AdminDashboard = () => {
  const { apis, loading: apisLoading, addApi, updateApi, deleteApi, toggleApiField } = useApis();
  const { logs, addLog, clearLogs } = useLogs();
  const { proxies } = useProxies();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingApi, setEditingApi] = React.useState<any>(null);
  
  const adminAuth = sessionStorage.getItem('adminAuth');

  if (!adminAuth) {
    return <Navigate to="/admin" replace />;
  }

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuth');
    window.location.href = '/';
  };

  const handleFormSubmit = async (data: any) => {
    const apiData = {
      name: data.name,
      url: data.url,
      method: data.method,
      headers: JSON.parse(data.headers || '{}'),
      body: JSON.parse(data.body || '{}'),
      query_params: JSON.parse(data.query_params || '{}'),
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
      
      {/* Custom Header */}
      <header className="border-b border-primary/30 bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/30 glow-primary">
              <Database className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-primary text-glow">ADMIN PANEL</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:glow-destructive"
          >
            <LogOut className="w-4 h-4 mr-2" />
            LOGOUT
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">{/* removed relative */}
        <DisclaimerBanner />

        {/* Hit Engine */}
        <HitEngine apis={apis} proxies={proxies} onLogCreate={addLog} />

        {/* Tabs for API Management */}
        <Tabs defaultValue="apis" className="space-y-4">
          <TabsList className="bg-muted/30 border border-primary/30">
            <TabsTrigger value="apis" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <List className="w-4 h-4 mr-2" />
              APIs ({apis.length})
            </TabsTrigger>
            <TabsTrigger value="import" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
              <Code className="w-4 h-4 mr-2" />
              Import API (Node.js Fetch)
            </TabsTrigger>
          </TabsList>

          {/* APIs Tab */}
          <TabsContent value="apis">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* APIs Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-primary text-glow flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    API List
                  </h2>
                  <Button
                    onClick={() => setFormOpen(true)}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add API
                  </Button>
                </div>

                {apisLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                ) : apis.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-primary/30 rounded-lg">
                    <Database className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No APIs added yet</p>
                    <Button
                      onClick={() => setFormOpen(true)}
                      variant="outline"
                      className="mt-4 border-primary/50 text-primary"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First API
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4">
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
              <LogsPanel logs={logs} onClear={clearLogs} />
            </div>
          </TabsContent>

          {/* Import API Tab */}
          <TabsContent value="import">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ApiImporter onApiAdd={handleImportApi} />
              
              {/* Logs Section */}
              <LogsPanel logs={logs} onClear={clearLogs} />
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
