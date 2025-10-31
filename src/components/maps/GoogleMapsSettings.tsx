
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const GoogleMapsSettings: React.FC = () => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const isConfigured = !!apiKey;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Google Maps Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConfigured ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Google Maps API is configured</strong>
              <br />
              <span className="font-mono text-xs bg-green-100 px-2 py-1 rounded mt-2 inline-block">
                VITE_GOOGLE_MAPS_API_KEY: {apiKey.substring(0, 20)}...
              </span>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Google Maps API key not configured</strong>
              <br />
              Address autocomplete and map features are disabled.
            </AlertDescription>
          </Alert>
        )}

        <div className="p-4 bg-muted rounded-lg space-y-3">
          <h4 className="font-semibold text-sm">🔒 Security Best Practice</h4>
          <p className="text-sm text-muted-foreground">
            For security reasons, API keys are stored in environment variables only, not in the database. 
            This prevents unauthorized access by other organization members and protects against data breaches.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-sm">How to configure the API key:</h4>
          <ol className="text-sm text-muted-foreground space-y-2 ml-4 list-decimal">
            <li>
              Get your API key from the{' '}
              <a 
                href="https://console.cloud.google.com/apis/credentials" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-primary hover:underline"
              >
                Google Cloud Console
              </a>
            </li>
            <li>
              In your project, create or update the <code className="bg-muted px-1 rounded">.env</code> file
            </li>
            <li>
              Add the line: <code className="bg-muted px-1 rounded">VITE_GOOGLE_MAPS_API_KEY=your_key_here</code>
            </li>
            <li>Restart your development server</li>
            <li>For production, add the environment variable in your hosting platform</li>
          </ol>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700 mb-2">
            <strong>Required Google Cloud APIs:</strong>
          </p>
          <ul className="text-sm text-blue-600 space-y-1 ml-4 list-disc">
            <li>Places API (for address autocomplete)</li>
            <li>Maps JavaScript API (for map display)</li>
            <li>Geocoding API (for address validation)</li>
          </ul>
          <p className="text-xs text-blue-600 mt-2">
            Remember to restrict your API key to your domain to prevent unauthorized use.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
