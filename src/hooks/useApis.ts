import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

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

// Placeholder user_id for admin panel (password-based auth)
const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000000';

// Legacy localStorage key for migration
const LEGACY_STORAGE_KEY = 'admin_apis';

export const useApis = () => {
  const [apis, setApis] = useState<Api[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('apis')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch APIs:', error);
        toast.error('Failed to load APIs from database');
        return;
      }

      // Transform database response to match our Api interface
      const transformedApis: Api[] = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        url: row.url,
        method: row.method,
        headers: (row.headers as Record<string, string>) || {},
        body: (row.body as Record<string, unknown>) || {},
        query_params: (row.query_params as Record<string, string>) || {},
        enabled: row.enabled ?? true,
        proxy_enabled: row.proxy_enabled ?? false,
        force_proxy: row.force_proxy ?? true,
        rotation_enabled: row.rotation_enabled ?? false,
        residential_proxy_enabled: row.residential_proxy_enabled ?? false,
      }));

      setApis(transformedApis);
    } catch (e) {
      console.error('Failed to load APIs:', e);
      toast.error('Database connection failed');
    } finally {
      setLoading(false);
    }
  };

  const addApi = async (apiData: Omit<Api, 'id'>): Promise<{ success: boolean; isDuplicate: boolean }> => {
    // Check for duplicate (same URL and method)
    const existingApi = apis.find(
      api => api.url.toLowerCase() === apiData.url.toLowerCase() && 
             api.method.toUpperCase() === apiData.method.toUpperCase()
    );

    if (existingApi) {
      toast.warning(`⚠️ Duplicate detected: "${existingApi.name}" has same URL and method. Adding anyway.`, {
        duration: 5000,
      });
    }

    try {
      const { data, error } = await supabase
        .from('apis')
        .insert({
          user_id: ADMIN_USER_ID,
          name: apiData.name,
          url: apiData.url,
          method: apiData.method,
          headers: apiData.headers as unknown as Json,
          body: apiData.body as unknown as Json,
          query_params: apiData.query_params as unknown as Json,
          enabled: apiData.enabled,
          proxy_enabled: apiData.proxy_enabled,
          force_proxy: apiData.force_proxy,
          rotation_enabled: apiData.rotation_enabled,
          residential_proxy_enabled: apiData.residential_proxy_enabled ?? false,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to add API:', error);
        toast.error('Failed to save API to database');
        return { success: false, isDuplicate: !!existingApi };
      }

      // Refresh the list
      await fetchApis();
      toast.success('API added successfully');
      return { success: true, isDuplicate: !!existingApi };
    } catch (e) {
      console.error('Failed to add API:', e);
      toast.error('Database error');
      return { success: false, isDuplicate: !!existingApi };
    }
  };

  const updateApi = async (id: string, updates: Partial<Api>) => {
    try {
      const { error } = await supabase
        .from('apis')
        .update({
          ...(updates.name !== undefined && { name: updates.name }),
          ...(updates.url !== undefined && { url: updates.url }),
          ...(updates.method !== undefined && { method: updates.method }),
          ...(updates.headers !== undefined && { headers: updates.headers as unknown as Json }),
          ...(updates.body !== undefined && { body: updates.body as unknown as Json }),
          ...(updates.query_params !== undefined && { query_params: updates.query_params as unknown as Json }),
          ...(updates.enabled !== undefined && { enabled: updates.enabled }),
          ...(updates.proxy_enabled !== undefined && { proxy_enabled: updates.proxy_enabled }),
          ...(updates.force_proxy !== undefined && { force_proxy: updates.force_proxy }),
          ...(updates.rotation_enabled !== undefined && { rotation_enabled: updates.rotation_enabled }),
          ...(updates.residential_proxy_enabled !== undefined && { residential_proxy_enabled: updates.residential_proxy_enabled }),
        })
        .eq('id', id);

      if (error) {
        console.error('Failed to update API:', error);
        toast.error('Failed to update API');
        return;
      }

      // Optimistic update
      setApis(prev => prev.map(api => 
        api.id === id ? { ...api, ...updates } : api
      ));
    } catch (e) {
      console.error('Failed to update API:', e);
      toast.error('Database error');
    }
  };

  const deleteApi = async (id: string) => {
    try {
      const { error } = await supabase
        .from('apis')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Failed to delete API:', error);
        toast.error('Failed to delete API');
        return;
      }

      setApis(prev => prev.filter(api => api.id !== id));
      toast.success('API deleted');
    } catch (e) {
      console.error('Failed to delete API:', e);
      toast.error('Database error');
    }
  };

  const toggleApiField = async (id: string, field: string, value: boolean) => {
    await updateApi(id, { [field]: value } as Partial<Api>);
  };

  const toggleAllApis = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('apis')
        .update({ enabled })
        .neq('id', ''); // Update all

      if (error) {
        console.error('Failed to toggle all APIs:', error);
        toast.error('Failed to update APIs');
        return;
      }

      setApis(prev => prev.map(api => ({ ...api, enabled })));
    } catch (e) {
      console.error('Failed to toggle all APIs:', e);
      toast.error('Database error');
    }
  };

  const migrateFromLocalStorage = async () => {
    try {
      const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!stored) {
        toast.info('No old APIs found in localStorage');
        return { migrated: 0 };
      }

      const oldApis: Api[] = JSON.parse(stored);
      if (!oldApis.length) {
        toast.info('No old APIs to migrate');
        return { migrated: 0 };
      }

      // Insert all old APIs to database
      const { error } = await supabase
        .from('apis')
        .insert(
          oldApis.map(api => ({
            user_id: ADMIN_USER_ID,
            name: api.name,
            url: api.url,
            method: api.method,
            headers: api.headers as unknown as Json,
            body: api.body as unknown as Json,
            query_params: api.query_params as unknown as Json,
            enabled: api.enabled,
            proxy_enabled: api.proxy_enabled,
            force_proxy: api.force_proxy,
            rotation_enabled: api.rotation_enabled,
            residential_proxy_enabled: api.residential_proxy_enabled ?? false,
          }))
        );

      if (error) {
        console.error('Failed to migrate APIs:', error);
        toast.error('Migration failed');
        return { migrated: 0 };
      }

      // Clear old localStorage and refresh data
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      await fetchApis();
      
      toast.success(`✅ ${oldApis.length} APIs migrated to database!`);
      return { migrated: oldApis.length };
    } catch (e) {
      console.error('Migration error:', e);
      toast.error('Migration failed');
      return { migrated: 0 };
    }
  };

  useEffect(() => {
    fetchApis();
  }, []);

  return { apis, loading, addApi, updateApi, deleteApi, toggleApiField, toggleAllApis, refetch: fetchApis, migrateFromLocalStorage };
};
