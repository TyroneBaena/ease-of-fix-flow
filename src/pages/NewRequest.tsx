
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Sparkles, Zap } from "lucide-react";
import { RequestForm } from "@/components/request/RequestForm";
import { RequestFormHeader } from "@/components/request/RequestFormHeader";
import { MaintenanceRequestChat } from "@/components/request/MaintenanceRequestChat";
import Navbar from '@/components/Navbar';

const AI_BANNER_DISMISSED_KEY = 'ai-assistant-banner-dismissed';

const NewRequest = () => {
  const [searchParams] = useSearchParams();
  const isPublic = searchParams.get('public') === 'true';
  const propertyId = searchParams.get('propertyId') || undefined;
  
  const [showBanner, setShowBanner] = useState(false);
  
  // Check if banner was previously dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem(AI_BANNER_DISMISSED_KEY);
    if (!dismissed) {
      setShowBanner(true);
    }
  }, []);
  
  const handleDismissBanner = () => {
    localStorage.setItem(AI_BANNER_DISMISSED_KEY, 'true');
    setShowBanner(false);
  };

  // Default to AI chat for public users, form for authenticated users
  const defaultTab = isPublic ? 'chat' : 'form';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Only show Navbar for authenticated users */}
      {!isPublic && <Navbar />}
      
      {/* Public header for QR code users */}
      {isPublic && (
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold text-foreground">Submit Maintenance Request</h1>
            <p className="text-muted-foreground text-base">Report a maintenance issue for this property</p>
          </div>
        </div>
      )}
      
      <main className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
        {!isPublic && <RequestFormHeader />}
        
        {/* Promotional Banner for AI Assistant */}
        {showBanner && (
          <div className="mb-6 relative overflow-hidden rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 rounded-full bg-primary/10 p-2">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">Try our AI Assistant!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Describe your maintenance issue in plain language and let AI help you submit a complete request faster. No need to fill out forms manually!
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={handleDismissBanner}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Dismiss</span>
              </Button>
            </div>
          </div>
        )}
        
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="mb-6">
            {/* AI Assistant tab first */}
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Assistant
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0">
                <Zap className="h-3 w-3 mr-0.5" />
                Faster
              </Badge>
            </TabsTrigger>
            {!isPublic && <TabsTrigger value="form">Form</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="chat">
            <Card className="shadow-sm">
              <CardContent className="p-6">
                <MaintenanceRequestChat propertyId={propertyId} isPublic={isPublic} />
              </CardContent>
            </Card>
          </TabsContent>
          
          {!isPublic && (
            <TabsContent value="form">
              <Card className="shadow-sm">
                <CardContent className="p-6">
                  <RequestForm />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default NewRequest;
