import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/dashboard/Header';
import DisclaimerBanner from '@/components/dashboard/DisclaimerBanner';
import ApiCard from '@/components/dashboard/ApiCard';
import ApiForm from '@/components/dashboard/ApiForm';
import HitEngine from '@/components/dashboard/HitEngine';
import LogsPanel from '@/components/dashboard/LogsPanel';
import { Button } from '@/components/ui/button';
import { useApis } from '@/hooks/useApis';
import { useLogs } from '@/hooks/useLogs';
import { useProxies } from '@/hooks/useProxies';
import { Plus, Database, Terminal, Loader2 } from 'lucide-react';

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { apis, loading: apisLoading, addApi, updateApi, deleteApi, toggleApiField, migrateFromLocalStorage } = useApis();
  const { logs, addLog, clearLogs } = useLogs();
  const { proxies } = useProxies();
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingApi, setEditingApi] = useState<any>(null);
  const [showMigration, setShowMigration] = useState(false);

  useEffect(() => {
    // Check if old localStorage data exists
    const hasOldData = localStorage.getItem('admin_apis');
    if (hasOldData) {
      try {
        const oldApis = JSON.parse(hasOldData);
        if (Array.isArray(oldApis) && oldApis.length > 0) {
          setShowMigration(true);
        }
      } catch (e) {
        console.error('Error checking old data:', e);
      }
    }
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

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
      residential_proxy_enabled: data.residential_proxy_enabled,
    };

    if (data.id) {
      await updateApi(data.id, apiData);
    } else {
      await addApi(apiData);
    }
    setEditingApi(null);
  };

  const handleEdit = (api: any) => {
    setEditingApi({
      ...api,
      headers: JSON.stringify(api.headers || {}, null, 2),
      body: JSON.stringify(api.body || {}, null, 2),
      query_params: JSON.stringify(api.query_params || {}, null, 2),
      residential_proxy_enabled: api.residential_proxy_enabled || false,
    });
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingApi(null);
  };

  const handleMigration = async () => {
    await migrateFromLocalStorage();
    setShowMigration(false);
  };

  return (
    <div className="min-h-screen bg-background scanline">
      <div className="absolute inset-0 gradient-matrix pointer-events-none" />
      
      <Header />

      <main className="container mx-auto px-4 py-6 space-y-6 relative">
        <DisclaimerBanner />

        {/* Migration Banner */}
        {showMigration && (
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 space-y-3">
            <p className="text-sm text-primary/80">📦 Puraane localStorage APIs database me migrate karne ke liye ready hain</p>
            <div className="flex gap-2">
              <Button
                onClick={handleMigration}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
              >
                Migrate Now
              </Button>
              <Button
                onClick={() => setShowMigration(false)}
                variant="outline"
                className="text-sm"
              >
                Skip
              </Button>
            </div>
          </div>
        )}

        {/* Hit Engine */}
        <HitEngine apis={apis} proxies={proxies} onLogCreate={addLog} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* APIs Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-primary text-glow flex items-center gap-2">
                <Database className="w-5 h-5" />
                APIs ({apis.length})
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

export default Dashboard;
