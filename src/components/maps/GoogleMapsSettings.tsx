
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Save, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { supabase } from '@/integrations/supabase/client';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useQueryClient } from '@tanstack/react-query';

export const GoogleMapsSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: appSettings, isLoading } = useAppSettings();
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (appSettings?.google_maps_api_key) {
      setApiKey(appSettings.google_maps_api_key);
    }
  }, [appSettings]);

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter a valid Google Maps API key');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) {
        throw new Error('No organization found');
      }

      // Upsert app settings
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          organization_id: profile.organization_id,
          google_maps_api_key: apiKey.trim()
        }, {
          onConflict: 'organization_id'
        });

      if (error) throw error;

      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      toast.success('Google Maps API key saved successfully');
    } catch (error) {
      console.error('Error saving API key:', error);
      toast.error('Failed to save API key');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearApiKey = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) {
        throw new Error('No organization found');
      }

      const { error } = await supabase
        .from('app_settings')
        .update({ google_maps_api_key: null })
        .eq('organization_id', profile.organization_id);

      if (error) throw error;

      setApiKey('');
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      toast.success('Google Maps API key cleared');
    } catch (error) {
      console.error('Error clearing API key:', error);
      toast.error('Failed to clear API key');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Google Maps Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="googleMapsApiKey">Google Maps API Key</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="googleMapsApiKey"
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => {
                  console.log('API Key input changed:', e.target.value.substring(0, 20) + '...');
                  setApiKey(e.target.value);
                }}
                onPaste={(e) => {
                  const pastedValue = e.clipboardData.getData('text');
                  console.log('API Key pasted:', pastedValue.substring(0, 20) + '...');
                  setApiKey(pastedValue);
                }}
                placeholder="Enter your Google Maps API key"
                className="pr-10"
                disabled={isSaving}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => setShowApiKey(!showApiKey)}
                disabled={isSaving}
              >
                {showApiKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
            <Button 
              onClick={() => {
                console.log('Save button clicked, API Key length:', apiKey.length);
                handleSaveApiKey();
              }} 
              disabled={!apiKey || isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              Save
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Current key length: {apiKey.length} characters
          </p>
        </div>

        {appSettings?.google_maps_api_key && (
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-medium">Google Maps is configured</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleClearApiKey} disabled={isSaving}>
              Clear
            </Button>
          </div>
        )}

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700 mb-2">
            <strong>To get your Google Maps API key:</strong>
          </p>
          <ol className="text-sm text-blue-600 space-y-1 ml-4 list-decimal">
            <li>Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
            <li>Create a new project or select an existing one</li>
            <li>Enable the Places API</li>
            <li>Create credentials (API key)</li>
            <li>Restrict the API key to your domain for security</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};
