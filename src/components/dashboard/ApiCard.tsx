import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Globe, Shield, RotateCcw, Zap } from 'lucide-react';

interface Api {
  id: string;
  name: string;
  url: string;
  method: string;
  enabled: boolean;
  proxy_enabled: boolean;
  force_proxy: boolean;
  rotation_enabled: boolean;
}

interface ApiCardProps {
  api: Api;
  onToggle: (id: string, field: string, value: boolean) => void;
  onEdit: (api: Api) => void;
  onDelete: (id: string) => void;
}

const ApiCard: React.FC<ApiCardProps> = ({ api, onToggle, onEdit, onDelete }) => {
  const isHttp = api.url.toLowerCase().startsWith('http://');
  const methodColors: Record<string, string> = {
    GET: 'bg-success/20 text-success border-success/30',
    POST: 'bg-secondary/20 text-secondary border-secondary/30',
    PUT: 'bg-warning/20 text-warning border-warning/30',
    DELETE: 'bg-destructive/20 text-destructive border-destructive/30',
  };

  return (
    <Card className={`border transition-all duration-300 ${
      api.enabled 
        ? 'border-primary/50 bg-card glow-primary' 
        : 'border-muted/30 bg-muted/10 opacity-60'
    }`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg text-primary flex items-center gap-2 truncate">
              {api.name}
              {isHttp && (
                <Badge variant="outline" className="text-warning border-warning/50 text-xs">
                  HTTP
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground truncate mt-1">{api.url}</p>
          </div>
          <Badge className={`${methodColors[api.method] || 'bg-muted'} border shrink-0`}>
            {api.method}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Toggles */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between p-2 rounded bg-muted/20 border border-muted/30">
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-primary" />
              <span className="text-muted-foreground">Enable</span>
            </div>
            <Switch
              checked={api.enabled}
              onCheckedChange={(v) => onToggle(api.id, 'enabled', v)}
              className="scale-75"
            />
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-muted/20 border border-muted/30">
            <div className="flex items-center gap-1">
              <Globe className="w-3 h-3 text-secondary" />
              <span className="text-muted-foreground">Proxy</span>
            </div>
            <Switch
              checked={api.proxy_enabled}
              onCheckedChange={(v) => onToggle(api.id, 'proxy_enabled', v)}
              className="scale-75"
            />
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-muted/20 border border-muted/30">
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-warning" />
              <span className="text-muted-foreground">Force</span>
            </div>
            <Switch
              checked={api.force_proxy}
              onCheckedChange={(v) => onToggle(api.id, 'force_proxy', v)}
              className="scale-75"
            />
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-muted/20 border border-muted/30">
            <div className="flex items-center gap-1">
              <RotateCcw className="w-3 h-3 text-accent" />
              <span className="text-muted-foreground">Rotate</span>
            </div>
            <Switch
              checked={api.rotation_enabled}
              onCheckedChange={(v) => onToggle(api.id, 'rotation_enabled', v)}
              className="scale-75"
            />
          </div>
        </div>

        {/* Status indicators */}
        {isHttp && api.force_proxy && (
          <p className="text-xs text-warning bg-warning/10 p-2 rounded border border-warning/30">
            🌐 HTTP detected → Proxy auto-enabled
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(api)}
            className="flex-1 border-primary/50 text-primary hover:bg-primary/10"
          >
            <Edit className="w-3 h-3 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(api.id)}
            className="border-destructive/50 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiCard;
