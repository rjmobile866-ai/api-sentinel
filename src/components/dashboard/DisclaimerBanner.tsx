import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useSiteSettings } from '@/hooks/useSiteSettings';

const DisclaimerBanner: React.FC = () => {
  const { settings } = useSiteSettings();

  return (
    <div className="bg-warning/10 border border-warning/50 rounded-lg p-4 flex items-center gap-3">
      <AlertTriangle className="w-6 h-6 text-warning shrink-0" />
      <div>
        <p className="text-warning font-semibold text-sm">{settings.disclaimerTitle}</p>
        <p className="text-warning/80 text-xs">
          {settings.disclaimerText}
        </p>
      </div>
    </div>
  );
};

export default DisclaimerBanner;
