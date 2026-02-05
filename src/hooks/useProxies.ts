import { useState } from 'react';

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
  const [proxies] = useState<Proxy[]>(DEFAULT_PROXIES);
  const [loading] = useState(false);

  const refetch = () => {
    // No-op for now, using default proxies
  };

  return { proxies, loading, refetch };
};
