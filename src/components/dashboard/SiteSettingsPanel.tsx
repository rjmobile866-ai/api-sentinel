import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Settings, RotateCcw, Save, Image, Type, AlertTriangle, Lock, Home, Key } from 'lucide-react';
import { toast } from 'sonner';
import { useSiteSettings, SiteSettings } from '@/hooks/useSiteSettings';
import { useSiteConfig } from '@/hooks/useSiteConfig';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const SiteSettingsPanel: React.FC = () => {
  const { settings, updateSettings, resetSettings, DEFAULT_SETTINGS } = useSiteSettings();
  const { adminPassword, accessKey, updateConfig } = useSiteConfig();
  const [formData, setFormData] = useState<SiteSettings>(settings);
  const [dbPassword, setDbPassword] = useState('');
  const [dbAccessKey, setDbAccessKey] = useState('');

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  useEffect(() => {
    setDbPassword(adminPassword);
    setDbAccessKey(accessKey);
  }, [adminPassword, accessKey]);

  const handleChange = (field: keyof SiteSettings, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    updateSettings(formData);
    // Save password and access key to DB
    await updateConfig('admin_password', dbPassword);
    await updateConfig('access_key', dbAccessKey);
    toast.success('Settings saved!');
  };

  const handleReset = () => {
    resetSettings();
    setFormData(DEFAULT_SETTINGS);
    toast.info('Settings reset to default');
  };

  return (
    <Card className="border-secondary/30 bg-card/50 backdrop-blur">
      <CardHeader className="py-3 px-4">
        <CardTitle className="flex items-center justify-between text-secondary text-glow text-base">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Site Settings
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="border-destructive/50 text-destructive hover:bg-destructive/10 text-xs"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-xs"
            >
              <Save className="w-3 h-3 mr-1" />
              Save
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        <Accordion type="multiple" defaultValue={['logo', 'header']} className="space-y-2">
          {/* Logo Section */}
          <AccordionItem value="logo" className="border border-primary/30 rounded-lg px-3">
            <AccordionTrigger className="py-2 text-sm">
              <div className="flex items-center gap-2 text-primary">
                <Image className="w-4 h-4" />
                Logo / Image
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-3 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Logo URL (Direct Image Link)</Label>
                <Input
                  value={formData.logoUrl}
                  onChange={(e) => handleChange('logoUrl', e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="bg-input border-primary/30 text-sm"
                />
              </div>
              {formData.logoUrl && (
                <div className="p-2 bg-muted/20 rounded-lg border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                  <img 
                    src={formData.logoUrl} 
                    alt="Logo Preview" 
                    className="h-8 w-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Header Section */}
          <AccordionItem value="header" className="border border-primary/30 rounded-lg px-3">
            <AccordionTrigger className="py-2 text-sm">
              <div className="flex items-center gap-2 text-primary">
                <Type className="w-4 h-4" />
                Header Texts
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Site Name</Label>
                  <Input
                    value={formData.siteName}
                    onChange={(e) => handleChange('siteName', e.target.value)}
                    className="bg-input border-primary/30 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Admin Button</Label>
                  <Input
                    value={formData.adminButtonText}
                    onChange={(e) => handleChange('adminButtonText', e.target.value)}
                    className="bg-input border-primary/30 text-sm"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Warning Banner */}
          <AccordionItem value="warning" className="border border-warning/30 rounded-lg px-3">
            <AccordionTrigger className="py-2 text-sm">
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle className="w-4 h-4" />
                Warning Banner
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-3 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Warning Text (Main Page)</Label>
                <Textarea
                  value={formData.warningText}
                  onChange={(e) => handleChange('warningText', e.target.value)}
                  className="bg-input border-warning/30 text-sm min-h-[60px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Disclaimer Title (Admin)</Label>
                <Input
                  value={formData.disclaimerTitle}
                  onChange={(e) => handleChange('disclaimerTitle', e.target.value)}
                  className="bg-input border-warning/30 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Disclaimer Text (Admin)</Label>
                <Textarea
                  value={formData.disclaimerText}
                  onChange={(e) => handleChange('disclaimerText', e.target.value)}
                  className="bg-input border-warning/30 text-sm min-h-[60px]"
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Quick Hit Engine */}
          <AccordionItem value="quickhit" className="border border-accent/30 rounded-lg px-3">
            <AccordionTrigger className="py-2 text-sm">
              <div className="flex items-center gap-2 text-accent">
                <Type className="w-4 h-4" />
                Quick Hit Engine
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Title</Label>
                  <Input
                    value={formData.quickHitTitle}
                    onChange={(e) => handleChange('quickHitTitle', e.target.value)}
                    className="bg-input border-accent/30 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Phone Label</Label>
                  <Input
                    value={formData.phoneLabel}
                    onChange={(e) => handleChange('phoneLabel', e.target.value)}
                    className="bg-input border-accent/30 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Phone Placeholder</Label>
                  <Input
                    value={formData.phonePlaceholder}
                    onChange={(e) => handleChange('phonePlaceholder', e.target.value)}
                    className="bg-input border-accent/30 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">No APIs Warning</Label>
                  <Input
                    value={formData.noApisWarning}
                    onChange={(e) => handleChange('noApisWarning', e.target.value)}
                    className="bg-input border-accent/30 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">HIT Button</Label>
                  <Input
                    value={formData.hitButtonText}
                    onChange={(e) => handleChange('hitButtonText', e.target.value)}
                    className="bg-input border-accent/30 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">STOP Button</Label>
                  <Input
                    value={formData.stopButtonText}
                    onChange={(e) => handleChange('stopButtonText', e.target.value)}
                    className="bg-input border-accent/30 text-sm"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Admin Panel */}
          <AccordionItem value="admin" className="border border-secondary/30 rounded-lg px-3">
            <AccordionTrigger className="py-2 text-sm">
              <div className="flex items-center gap-2 text-secondary">
                <Type className="w-4 h-4" />
                Admin Panel
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Panel Title</Label>
                  <Input
                    value={formData.adminPanelTitle}
                    onChange={(e) => handleChange('adminPanelTitle', e.target.value)}
                    className="bg-input border-secondary/30 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Logout Button</Label>
                  <Input
                    value={formData.logoutButtonText}
                    onChange={(e) => handleChange('logoutButtonText', e.target.value)}
                    className="bg-input border-secondary/30 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">API List Title</Label>
                  <Input
                    value={formData.apiListTitle}
                    onChange={(e) => handleChange('apiListTitle', e.target.value)}
                    className="bg-input border-secondary/30 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Add API Button</Label>
                  <Input
                    value={formData.addApiButtonText}
                    onChange={(e) => handleChange('addApiButtonText', e.target.value)}
                    className="bg-input border-secondary/30 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">No APIs Message</Label>
                <Input
                  value={formData.noApisText}
                  onChange={(e) => handleChange('noApisText', e.target.value)}
                  className="bg-input border-secondary/30 text-sm"
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Access Key */}
          <AccordionItem value="accesskey" className="border border-accent/30 rounded-lg px-3">
            <AccordionTrigger className="py-2 text-sm">
              <div className="flex items-center gap-2 text-accent">
                <Key className="w-4 h-4" />
                Access Key (User Key)
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-3 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Access Key (Homepage pe user ko yeh key dena hoga)</Label>
                <Input
                  value={dbAccessKey}
                  onChange={(e) => setDbAccessKey(e.target.value)}
                  placeholder="Set access key (blank = no key required)"
                  className="bg-input border-accent/30 text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  🔑 Blank rakhoge to bina key ke access milega. Key set karoge to user ko key dalna padega hit karne ke liye.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Security / Password */}
          <AccordionItem value="security" className="border border-destructive/30 rounded-lg px-3">
            <AccordionTrigger className="py-2 text-sm">
              <div className="flex items-center gap-2 text-destructive">
                <Lock className="w-4 h-4" />
                Security (Admin Password)
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-3 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Admin Panel Password (Stored securely in database)</Label>
                <Input
                  type="password"
                  value={dbPassword}
                  onChange={(e) => setDbPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="bg-input border-destructive/30 text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  🔒 Password database me securely store hoga, frontend me nahi
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Residential Proxy */}
          <AccordionItem value="proxy" className="border border-purple-500/30 rounded-lg px-3 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
            <AccordionTrigger className="py-2 text-sm">
              <div className="flex items-center gap-2 text-purple-400">
                <Home className="w-4 h-4" />
                Residential Proxy
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-3 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Proxy URL (with credentials)</Label>
                <Input
                  type="password"
                  value={formData.residentialProxyUrl}
                  onChange={(e) => handleChange('residentialProxyUrl', e.target.value)}
                  placeholder="http://user:pass@proxy.example.com:port"
                  className="bg-input border-purple-500/30 text-sm font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Format: <code className="text-purple-400">http://username:password@host:port</code>
                </p>
                <p className="text-xs text-muted-foreground">
                  Providers: Bright Data, Oxylabs, Smartproxy, IPRoyal
                </p>
              </div>
              {formData.residentialProxyUrl && (
                <div className="p-2 bg-purple-500/10 rounded border border-purple-500/30">
                  <p className="text-xs text-purple-400">✅ Proxy URL configured</p>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default SiteSettingsPanel;
