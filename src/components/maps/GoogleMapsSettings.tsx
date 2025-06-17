
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Save, Eye, EyeOff } from "lucide-react";
import { toast } from "@/lib/toast";

interface GoogleMapsSettingsProps {
  onApiKeyChange?: (apiKey: string) => void;
}

export const GoogleMapsSettings: React.FC<GoogleMapsSettingsProps> = ({ onApiKeyChange }) => {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // Load API key from localStorage on component mount
    const savedApiKey = localStorage.getItem('googleMapsApiKey');
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setIsSaved(true);
      onApiKeyChange?.(savedApiKey);
    }
  }, [onApiKeyChange]);

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      toast.error('Please enter a valid Google Maps API key');
      return;
    }

    // Save to localStorage
    localStorage.setItem('googleMapsApiKey', apiKey.trim());
    setIsSaved(true);
    onApiKeyChange?.(apiKey.trim());
    toast.success('Google Maps API key saved successfully');
  };

  const handleClearApiKey = () => {
    localStorage.removeItem('googleMapsApiKey');
    setApiKey('');
    setIsSaved(false);
    onApiKeyChange?.('');
    toast.success('Google Maps API key cleared');
  };

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
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Google Maps API key"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
            <Button onClick={handleSaveApiKey} disabled={!apiKey.trim()}>
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
        </div>

        {isSaved && (
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-medium">Google Maps is configured</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleClearApiKey}>
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
