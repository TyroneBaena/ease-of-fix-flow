import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  Heart, 
  Clock, 
  Shield, 
  ArrowLeft,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useSubscription } from '@/contexts/subscription/SubscriptionContext';
import { useToast } from '@/hooks/use-toast';

interface CancellationFlowProps {
  onBack?: () => void;
  onComplete?: () => void;
}

type CancellationStep = 'reasons' | 'feedback' | 'confirmation' | 'processing' | 'completed';

const cancellationReasons = [
  { value: 'too_expensive', label: 'Too expensive', icon: '💰' },
  { value: 'not_using', label: 'Not using enough', icon: '📊' },
  { value: 'missing_features', label: 'Missing features I need', icon: '⚙️' },
  { value: 'found_alternative', label: 'Found a better alternative', icon: '🔄' },
  { value: 'temporary_pause', label: 'Temporary pause', icon: '⏸️' },
  { value: 'other', label: 'Other reason', icon: '📝' }
];

export const CancellationFlow: React.FC<CancellationFlowProps> = ({
  onBack,
  onComplete
}) => {
  const { toast } = useToast();
  const { 
    cancelTrial, 
    isTrialActive, 
    propertyCount, 
    monthlyAmount, 
    currency,
    daysRemaining 
  } = useSubscription();
  
  const [currentStep, setCurrentStep] = useState<CancellationStep>('reasons');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleNext = () => {
    if (currentStep === 'reasons' && selectedReason) {
      setCurrentStep('feedback');
    } else if (currentStep === 'feedback') {
      setCurrentStep('confirmation');
    }
  };

  const handleCancel = async () => {
    setCurrentStep('processing');
    setIsProcessing(true);
    
    try {
      const result = await cancelTrial();
      
      if (result.success) {
        setCurrentStep('completed');
        toast({
          title: "Subscription Cancelled",
          description: "Your subscription has been successfully cancelled.",
        });
        setTimeout(() => {
          onComplete?.();
        }, 3000);
      } else {
        toast({
          title: "Cancellation Failed",
          description: result.error || "Unable to cancel subscription. Please try again.",
          variant: "destructive",
        });
        setCurrentStep('confirmation');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setCurrentStep('confirmation');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderReasonsStep = () => (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          We're sorry to see you go
        </CardTitle>
        <CardDescription>
          Help us understand why you're cancelling so we can improve
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
          <div className="space-y-3">
            {cancellationReasons.map((reason) => (
              <div key={reason.value} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value={reason.value} id={reason.value} />
                <Label 
                  htmlFor={reason.value} 
                  className="flex items-center gap-3 cursor-pointer flex-1"
                >
                  <span className="text-lg">{reason.icon}</span>
                  <span>{reason.label}</span>
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button 
            onClick={handleNext} 
            disabled={!selectedReason}
            className="flex-1"
          >
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderFeedbackStep = () => (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Additional Feedback</CardTitle>
        <CardDescription>
          Any additional details that might help us improve? (Optional)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Textarea
          placeholder="Tell us more about your experience or what we could do better..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="min-h-[120px]"
        />

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Your feedback helps us improve our service for all users. Thank you for sharing!
          </AlertDescription>
        </Alert>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep('reasons')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleNext} className="flex-1">
            Continue to Cancellation
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderConfirmationStep = () => (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Confirm Cancellation
        </CardTitle>
        <CardDescription>
          Please review the details before confirming your cancellation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Subscription Details */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <h4 className="font-medium">Current Subscription</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span>{isTrialActive ? 'Free Trial' : 'Active Subscription'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Properties</span>
              <span>{propertyCount}</span>
            </div>
            {isTrialActive && daysRemaining && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Days Remaining</span>
                <span>{daysRemaining} days</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monthly Cost</span>
              <span>{currency?.toUpperCase()} ${monthlyAmount}</span>
            </div>
          </div>
        </div>

        {/* What Happens After Cancellation */}
        <div className="space-y-3">
          <h4 className="font-medium">What happens after cancellation:</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>You'll keep access until the end of your {isTrialActive ? 'trial period' : 'current billing cycle'}</span>
            </div>
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <span>No future charges will be made</span>
            </div>
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Your data will be safely stored for 30 days</span>
            </div>
            <div className="flex items-start gap-2">
              <Heart className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <span>You can reactivate anytime</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Selected Reason */}
        <div className="space-y-2">
          <h4 className="font-medium">Reason for cancellation:</h4>
          <p className="text-sm text-muted-foreground">
            {cancellationReasons.find(r => r.value === selectedReason)?.label}
          </p>
          {feedback && (
            <div className="bg-muted/50 rounded p-3 text-sm">
              <p className="font-medium mb-1">Additional feedback:</p>
              <p className="text-muted-foreground">{feedback}</p>
            </div>
          )}
        </div>

        <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            This action cannot be undone. Your subscription will be cancelled immediately.
          </AlertDescription>
        </Alert>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep('feedback')}
            className="flex items-center gap-2"
            disabled={isProcessing}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleCancel}
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Cancelling...
              </>
            ) : (
              'Confirm Cancellation'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderProcessingStep = () => (
    <Card className="max-w-md mx-auto">
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto animate-spin" />
          <div>
            <h3 className="font-medium">Processing Cancellation</h3>
            <p className="text-sm text-muted-foreground">
              Please wait while we process your request...
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderCompletedStep = () => (
    <Card className="max-w-md mx-auto">
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
          <div>
            <h3 className="font-medium">Cancellation Complete</h3>
            <p className="text-sm text-muted-foreground">
              Your subscription has been successfully cancelled.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Redirecting you back to billing...
          </p>
        </div>
      </CardContent>
    </Card>
  );

  switch (currentStep) {
    case 'reasons':
      return renderReasonsStep();
    case 'feedback':
      return renderFeedbackStep();
    case 'confirmation':
      return renderConfirmationStep();
    case 'processing':
      return renderProcessingStep();
    case 'completed':
      return renderCompletedStep();
    default:
      return renderReasonsStep();
  }
};