import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSiteConfig = () => {
  const [adminPassword, setAdminPassword] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_config')
        .select('key, value');

      if (error) {
        console.error('Failed to fetch site config:', error);
        return;
      }

      for (const row of data || []) {
        if (row.key === 'admin_password') setAdminPassword(row.value);
        if (row.key === 'access_key') setAccessKey(row.value);
      }
    } catch (e) {
      console.error('Failed to load site config:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const updateConfig = async (key: string, value: string) => {
    const { error } = await supabase
      .from('site_config')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key);

    if (error) {
      console.error(`Failed to update ${key}:`, error);
      return false;
    }

    if (key === 'admin_password') setAdminPassword(value);
    if (key === 'access_key') setAccessKey(value);
    return true;
  };

  return { adminPassword, accessKey, loading, updateConfig, refetch: fetchConfig };
};
