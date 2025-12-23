
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { RequestForm } from "@/components/request/RequestForm";
import { RequestFormHeader } from "@/components/request/RequestFormHeader";
import { MaintenanceRequestChat } from "@/components/request/MaintenanceRequestChat";
import Navbar from '@/components/Navbar';

const NewRequest = () => {
  const [searchParams] = useSearchParams();
  const isPublic = searchParams.get('public') === 'true';
  const propertyId = searchParams.get('propertyId') || undefined;

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
        
        <Tabs defaultValue="form" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="form">Form</TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              AI Assistant
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Beta</Badge>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="form">
            <Card className="shadow-sm">
              <CardContent className="p-6">
                <RequestForm />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="chat">
            <Card className="shadow-sm">
              <CardContent className="p-6">
                <MaintenanceRequestChat propertyId={propertyId} isPublic={isPublic} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default NewRequest;
