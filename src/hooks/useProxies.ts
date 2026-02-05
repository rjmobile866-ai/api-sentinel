import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Proxy {
  id: string;
  name: string;
  url: string;
  is_active: boolean;
  priority: number;
}

// Default proxies available to all users
const DEFAULT_PROXIES: Proxy[] = [
  { id: 'default-1', name: 'AllOrigins', url: 'https://api.allorigins.win/raw?url=', is_active: true, priority: 1 },
  { id: 'default-2', name: 'CORS Anywhere', url: 'https://cors-anywhere.herokuapp.com/', is_active: true, priority: 2 },
  { id: 'default-3', name: 'ThingProxy', url: 'https://thingproxy.freeboard.io/fetch/', is_active: true, priority: 3 },
];

export const useProxies = () => {
  const { user } = useAuth();
  const [proxies, setProxies] = useState<Proxy[]>(DEFAULT_PROXIES);
  const [loading, setLoading] = useState(true);

  const fetchProxies = async () => {
    if (!user) {
      setProxies(DEFAULT_PROXIES);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('cors_proxies')
      .select('*')
      .eq('user_id', user.id)
      .order('priority', { ascending: true });

    if (error) {
      console.error('Failed to fetch proxies:', error);
      setProxies(DEFAULT_PROXIES);
    } else if (data && data.length > 0) {
      setProxies(data);
    } else {
      setProxies(DEFAULT_PROXIES);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProxies();
  }, [user]);

  return { proxies, loading, refetch: fetchProxies };
};
