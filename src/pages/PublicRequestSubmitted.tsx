import { CheckCircle2, ArrowLeft, FileText } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const PublicRequestSubmitted = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const requestId = searchParams.get('id');
  const propertyId = searchParams.get('propertyId');

  const handleViewRequest = () => {
    if (requestId) {
      navigate(`/public-request/${requestId}`);
    }
  };

  const handleBackToProperty = () => {
    if (propertyId) {
      navigate(`/property-requests/${propertyId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 flex flex-col items-center text-center space-y-6">
          <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
            <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">
              Request Submitted Successfully!
            </h1>
            <p className="text-muted-foreground">
              Your maintenance request has been received and will be reviewed shortly.
            </p>
          </div>

          {requestId && (
            <div className="bg-muted/50 rounded-lg px-4 py-2">
              <p className="text-sm text-muted-foreground">Reference ID</p>
              <p className="font-mono text-sm font-medium text-foreground">
                {requestId.slice(0, 8).toUpperCase()}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3 w-full pt-2">
            {requestId && (
              <Button onClick={handleViewRequest} className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                View Request Details
              </Button>
            )}
            
            {propertyId && (
              <Button variant="outline" onClick={handleBackToProperty} className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Property
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicRequestSubmitted;
