import { useState, useEffect } from 'react';

export interface SiteSettings {
  // Header
  siteName: string;
  adminButtonText: string;
  
  // Warning Banner
  warningText: string;
  
  // Quick Hit Engine
  quickHitTitle: string;
  phoneLabel: string;
  phonePlaceholder: string;
  hitButtonText: string;
  stopButtonText: string;
  noApisWarning: string;
  
  // Admin Panel
  adminPanelTitle: string;
  logoutButtonText: string;
  disclaimerTitle: string;
  disclaimerText: string;
  apiListTitle: string;
  addApiButtonText: string;
  noApisText: string;
  
  // Logo
  logoUrl: string;
  
  // Security
  adminPassword: string;
}

const DEFAULT_SETTINGS: SiteSettings = {
  siteName: 'RIO METH',
  adminButtonText: 'ADMIN',
  warningText: '⚠️ Sirf authorized testing aur educational purpose ke liye.',
  quickHitTitle: 'QUICK HIT',
  phoneLabel: 'Phone Number',
  phonePlaceholder: '91XXXXXXXXXX',
  hitButtonText: 'HIT',
  stopButtonText: 'STOP',
  noApisWarning: 'Admin me APIs add karo.',
  adminPanelTitle: 'ADMIN PANEL',
  logoutButtonText: 'LOGOUT',
  disclaimerTitle: '⚠️ DISCLAIMER',
  disclaimerText: 'Yeh tool sirf authorized testing aur educational purpose ke liye hai. Unauthorized use strictly prohibited.',
  apiListTitle: 'API List',
  addApiButtonText: 'Add API',
  noApisText: 'No APIs added yet',
  logoUrl: '',
  adminPassword: '12345',
};

const STORAGE_KEY = 'site_settings';

export const useSiteSettings = () => {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      } catch (e) {
        console.error('Failed to load site settings:', e);
      }
      setLoading(false);
    };

    loadSettings();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        loadSettings();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const updateSettings = (newSettings: Partial<SiteSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Trigger storage event for other tabs/components
    window.dispatchEvent(new Event('storage'));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('storage'));
  };

  return { settings, loading, updateSettings, resetSettings, DEFAULT_SETTINGS };
};
