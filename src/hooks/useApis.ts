import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

interface Api {
  id: string;
  name: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  query_params: Record<string, string>;
  enabled: boolean;
  proxy_enabled: boolean;
  force_proxy: boolean;
  rotation_enabled: boolean;
}

export const useApis = () => {
  const { user } = useAuth();
  const [apis, setApis] = useState<Api[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApis = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('apis')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load APIs');
      console.error(error);
    } else {
      setApis(data.map(api => ({
        ...api,
        headers: (api.headers as Record<string, string>) || {},
        body: (api.body as Record<string, unknown>) || {},
        query_params: (api.query_params as Record<string, string>) || {},
      })));
    }
    setLoading(false);
  };

  const addApi = async (apiData: Omit<Api, 'id'>) => {
    if (!user) return;

    const { error } = await supabase.from('apis').insert({
      user_id: user.id,
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
    });

    if (error) {
      toast.error('Failed to add API');
      console.error(error);
    } else {
      toast.success('API added successfully');
      fetchApis();
    }
  };

  const updateApi = async (id: string, updates: Partial<Api>) => {
    const updateData: Record<string, unknown> = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.url !== undefined) updateData.url = updates.url;
    if (updates.method !== undefined) updateData.method = updates.method;
    if (updates.headers !== undefined) updateData.headers = updates.headers as unknown as Json;
    if (updates.body !== undefined) updateData.body = updates.body as unknown as Json;
    if (updates.query_params !== undefined) updateData.query_params = updates.query_params as unknown as Json;
    if (updates.enabled !== undefined) updateData.enabled = updates.enabled;
    if (updates.proxy_enabled !== undefined) updateData.proxy_enabled = updates.proxy_enabled;
    if (updates.force_proxy !== undefined) updateData.force_proxy = updates.force_proxy;
    if (updates.rotation_enabled !== undefined) updateData.rotation_enabled = updates.rotation_enabled;

    const { error } = await supabase
      .from('apis')
      .update(updateData)
      .eq('id', id);

    if (error) {
      toast.error('Failed to update API');
      console.error(error);
    } else {
      fetchApis();
    }
  };

  const deleteApi = async (id: string) => {
    const { error } = await supabase.from('apis').delete().eq('id', id);

    if (error) {
      toast.error('Failed to delete API');
      console.error(error);
    } else {
      toast.success('API deleted');
      fetchApis();
    }
  };

  const toggleApiField = async (id: string, field: string, value: boolean) => {
    await updateApi(id, { [field]: value } as Partial<Api>);
  };

  useEffect(() => {
    fetchApis();
  }, [user]);

  return { apis, loading, addApi, updateApi, deleteApi, toggleApiField, refetch: fetchApis };
};
