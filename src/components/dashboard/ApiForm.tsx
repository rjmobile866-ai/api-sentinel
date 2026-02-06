import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Save } from 'lucide-react';

interface ApiFormData {
  id?: string;
  name: string;
  url: string;
  method: string;
  headers: string;
  body: string;
  query_params: string;
  enabled: boolean;
  proxy_enabled: boolean;
  force_proxy: boolean;
  rotation_enabled: boolean;
  residential_proxy_enabled: boolean;
}

interface ApiFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ApiFormData) => void;
  editData?: ApiFormData | null;
}

const defaultFormData: ApiFormData = {
  name: '',
  url: '',
  method: 'GET',
  headers: '{}',
  body: '{}',
  query_params: '{}',
  enabled: true,
  proxy_enabled: false,
  force_proxy: true,
  rotation_enabled: false,
  residential_proxy_enabled: false,
};

const ApiForm: React.FC<ApiFormProps> = ({ open, onClose, onSubmit, editData }) => {
  const [formData, setFormData] = useState<ApiFormData>(defaultFormData);

  useEffect(() => {
    if (editData) {
      setFormData(editData);
    } else {
      setFormData(defaultFormData);
    }
  }, [editData, open]);

  useEffect(() => {
    const isHttp = formData.url.toLowerCase().startsWith('http://');
    if (isHttp && formData.force_proxy && !formData.proxy_enabled) {
      setFormData(prev => ({ ...prev, proxy_enabled: true }));
    }
  }, [formData.url, formData.force_proxy]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const isHttp = formData.url.toLowerCase().startsWith('http://');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-primary/30 text-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary text-glow flex items-center gap-2">
            {editData ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            {editData ? 'Edit API' : 'Add New API'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">API Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My API"
                required
                className="bg-input border-primary/30 focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">HTTP Method</Label>
              <Select value={formData.method} onValueChange={(v) => setFormData({ ...formData, method: v })}>
                <SelectTrigger className="bg-input border-primary/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-primary/30">
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">API URL</Label>
            <Input
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://api.example.com/endpoint?phone={PHONE}"
              required
              className="bg-input border-primary/30 focus:border-primary"
            />
            <p className="text-xs text-muted-foreground">
              Use <code className="text-primary">{'{PHONE}'}</code> as placeholder for phone number
            </p>
            {isHttp && (
              <p className="text-xs text-warning bg-warning/10 p-2 rounded border border-warning/30">
                🌐 HTTP detected → Proxy will be auto-enabled if Force Proxy is ON
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Headers (JSON)</Label>
            <Textarea
              value={formData.headers}
              onChange={(e) => setFormData({ ...formData, headers: e.target.value })}
              placeholder='{"Authorization": "Bearer token"}'
              className="bg-input border-primary/30 focus:border-primary font-mono text-sm min-h-[60px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Body (JSON)</Label>
            <Textarea
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder='{"phone": "{PHONE}"}'
              className="bg-input border-primary/30 focus:border-primary font-mono text-sm min-h-[60px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Query Parameters (JSON)</Label>
            <Textarea
              value={formData.query_params}
              onChange={(e) => setFormData({ ...formData, query_params: e.target.value })}
              placeholder='{"phone": "{PHONE}"}'
              className="bg-input border-primary/30 focus:border-primary font-mono text-sm min-h-[60px]"
            />
          </div>

          {/* Toggle Grid */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/10 rounded-lg border border-muted/30">
            <div className="flex items-center justify-between">
              <Label className="text-sm">✅ Enable API</Label>
              <Switch
                checked={formData.enabled}
                onCheckedChange={(v) => setFormData({ ...formData, enabled: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">🌐 Enable CORS Proxy</Label>
              <Switch
                checked={formData.proxy_enabled}
                onCheckedChange={(v) => setFormData({ ...formData, proxy_enabled: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">🔁 Force Proxy (HTTP)</Label>
              <Switch
                checked={formData.force_proxy}
                onCheckedChange={(v) => setFormData({ ...formData, force_proxy: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">🎲 Allow Rotation</Label>
              <Switch
                checked={formData.rotation_enabled}
                onCheckedChange={(v) => setFormData({ ...formData, rotation_enabled: v })}
              />
            </div>
          </div>

          {/* Residential Proxy Toggle - Highlighted */}
          <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/30">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-purple-400">🏠 Residential Proxy</Label>
                <p className="text-xs text-muted-foreground mt-1">Use paid residential proxy for this API (bypasses strict blocks)</p>
              </div>
              <Switch
                checked={formData.residential_proxy_enabled}
                onCheckedChange={(v) => setFormData({ ...formData, residential_proxy_enabled: v })}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-muted/50">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
              {editData ? 'Update API' : 'Add API'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ApiForm;
