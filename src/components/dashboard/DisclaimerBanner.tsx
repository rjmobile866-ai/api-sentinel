import React from 'react';
import { AlertTriangle } from 'lucide-react';

const DisclaimerBanner: React.FC = () => {
  return (
    <div className="bg-warning/10 border border-warning/50 rounded-lg p-4 flex items-center gap-3">
      <AlertTriangle className="w-6 h-6 text-warning shrink-0" />
      <div>
        <p className="text-warning font-semibold text-sm">⚠️ DISCLAIMER</p>
        <p className="text-warning/80 text-xs">
          Yeh tool sirf authorized testing aur educational purpose ke liye hai. 
          Unauthorized use strictly prohibited.
        </p>
      </div>
    </div>
  );
};

export default DisclaimerBanner;
