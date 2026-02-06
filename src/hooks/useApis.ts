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
}

// Store APIs in localStorage for unauthenticated admin
const STORAGE_KEY = 'admin_apis';

export const useApis = () => {
  const [apis, setApis] = useState<Api[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApis = async () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setApis(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load APIs from storage:', e);
    }
    setLoading(false);
  };

  const saveToStorage = (newApis: Api[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newApis));
    } catch (e) {
      console.error('Failed to save APIs:', e);
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

    const newApi: Api = {
      id: Math.random().toString(36).substr(2, 9),
      ...apiData,
    };
    
    const updated = [...apis, newApi];
    setApis(updated);
    saveToStorage(updated);
    toast.success('API added successfully');
    
    return { success: true, isDuplicate: !!existingApi };
  };

  const updateApi = async (id: string, updates: Partial<Api>) => {
    const updated = apis.map(api =>
      api.id === id ? { ...api, ...updates } : api
    );
    setApis(updated);
    saveToStorage(updated);
  };

  const deleteApi = async (id: string) => {
    const updated = apis.filter(api => api.id !== id);
    setApis(updated);
    saveToStorage(updated);
    toast.success('API deleted');
  };

  const toggleApiField = async (id: string, field: string, value: boolean) => {
    await updateApi(id, { [field]: value } as Partial<Api>);
  };

  useEffect(() => {
    fetchApis();
  }, []);

  return { apis, loading, addApi, updateApi, deleteApi, toggleApiField, refetch: fetchApis };
};
