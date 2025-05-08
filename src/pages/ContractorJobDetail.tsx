
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ContractorHeader } from '@/components/contractor/ContractorHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MaintenanceRequest } from '@/types/maintenance';
import { formatDistanceToNow, format } from 'date-fns';
import { ArrowLeft, Settings, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/lib/toast';
import { ContractorProvider } from '@/contexts/contractor';
import { JobProgressDialog } from '@/components/contractor/JobProgressDialog';

const ContractorJobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<MaintenanceRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  
  useEffect(() => {
    if (!id) return;
    
    const fetchJobDetails = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('maintenance_requests')
          .select(`
            *,
            quotes(*)
          `)
          .eq('id', id)
          .single();
          
        if (error) throw error;
        
        if (data) {
          // Helper function to safely handle potentially non-array JSON fields
          const safeArrayFromJSON = (jsonField: any): any[] => {
            if (!jsonField) return [];
            if (Array.isArray(jsonField)) return jsonField;
            try {
              const parsed = typeof jsonField === 'string' ? JSON.parse(jsonField) : jsonField;
              return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              console.warn('Failed to parse JSON array:', e);
              return [];
            }
          };
          
          const formattedJob: MaintenanceRequest = {
            id: data.id,
            title: data.title,
            description: data.description || data.explanation || '',
            status: data.status as 'pending' | 'in-progress' | 'completed' | 'open',
            location: data.location || '',
            priority: data.priority as 'low' | 'medium' | 'high' || 'medium',
            site: data.site || data.category || '',
            submittedBy: data.submitted_by || 'Unknown',
            date: data.created_at,
            propertyId: data.property_id,
            contactNumber: data.contact_number || '',
            address: data.address || '',
            practiceLeader: data.practice_leader || '',
            practiceLeaderPhone: data.practice_leader_phone || '',
            attachments: safeArrayFromJSON(data.attachments),
            category: data.category,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            dueDate: data.due_date,
            assignedTo: data.assigned_to,
            history: safeArrayFromJSON(data.history),
            isParticipantRelated: data.is_participant_related || false,
            participantName: data.participant_name || 'N/A',
            attemptedFix: data.attempted_fix || '',
            issueNature: data.issue_nature || '',
            explanation: data.explanation || '',
            reportDate: data.report_date || '',
            contractorId: data.contractor_id,
            assignedAt: data.assigned_at,
            completionPercentage: data.completion_percentage || 0,
            completionPhotos: safeArrayFromJSON(data.completion_photos),
            progressNotes: safeArrayFromJSON(data.progress_notes),
            quoteRequested: data.quote_requested || false,
            quotedAmount: data.quoted_amount,
            // Add quotes if there are any
            quotes: data.quotes && data.quotes.length > 0 ? data.quotes : undefined
          };
          
          setJob(formattedJob);
        } else {
          setError('Job not found');
        }
      } catch (err) {
        console.error('Error fetching job details:', err);
        setError('Failed to load job details');
        toast.error('Failed to load job details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchJobDetails();
  }, [id]);
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'in-progress':
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'low':
        return <Badge variant="outline" className="border-green-500 text-green-700">Low</Badge>;
      case 'medium':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Medium</Badge>;
      case 'high':
        return <Badge variant="outline" className="border-red-500 text-red-700">High</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ContractorHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Skeleton className="h-64 w-full mb-6" />
              <Skeleton className="h-96 w-full" />
            </div>
            <div>
              <Skeleton className="h-64 w-full mb-6" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ContractorHeader />
        <main className="container mx-auto px-4 py-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || 'Job not found'}</AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ContractorHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">{job.title}</h1>
            {getStatusBadge(job.status)}
          </div>
          
          {job.status === 'in-progress' && (
            <Button onClick={() => setProgressDialogOpen(true)}>Update Progress</Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Job Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Job ID</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">{job.id}</dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Priority</dt>
                    <dd className="mt-1">{getPriorityBadge(job.priority || 'medium')}</dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Location</dt>
                    <dd className="mt-1 text-sm text-gray-900">{job.location}</dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Site</dt>
                    <dd className="mt-1 text-sm text-gray-900">{job.site || job.category || 'N/A'}</dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Submitted By</dt>
                    <dd className="mt-1 text-sm text-gray-900">{job.submittedBy}</dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Submission Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {job.createdAt ? format(new Date(job.createdAt), 'PPP') : 'N/A'}
                    </dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Quoted Amount</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {job.quotedAmount ? `$${job.quotedAmount}` : 'Not quoted'}
                    </dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Completion</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {job.completionPercentage || 0}%
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Issue Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Description</h3>
                  <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{job.description}</p>
                </div>
                
                {job.explanation && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Explanation</h3>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{job.explanation}</p>
                  </div>
                )}
                
                {job.attemptedFix && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Attempted Fix</h3>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{job.attemptedFix}</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {job.attachments && job.attachments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Attachments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {job.attachments.map((attachment, index) => (
                      <a 
                        key={index}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block border rounded-md overflow-hidden hover:opacity-80 transition-opacity"
                      >
                        <img 
                          src={attachment.url} 
                          alt={`Attachment ${index + 1}`}
                          className="w-full h-32 object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${job.completionPercentage || 0}%` }}
                    ></div>
                  </div>
                  <span className="ml-2 text-sm font-medium">{job.completionPercentage || 0}%</span>
                </div>
                
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Progress Status</h3>
                  {job.status === 'completed' ? (
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      <span>Completed</span>
                    </div>
                  ) : job.status === 'in-progress' ? (
                    <div className="flex items-center text-blue-600">
                      <Clock className="h-5 w-5 mr-2" />
                      <span>In Progress</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-yellow-600">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      <span>Pending</span>
                    </div>
                  )}
                </div>
                
                {job.progressNotes && job.progressNotes.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Progress Notes</h3>
                    <ul className="space-y-2">
                      {job.progressNotes.map((note, index) => {
                        // Handle different note formats
                        const noteText = typeof note === 'string' ? note : note.note;
                        const timestamp = typeof note === 'string' ? null : note.timestamp;
                        
                        return (
                          <li key={index} className="text-sm bg-gray-50 p-3 rounded-md">
                            <p>{noteText}</p>
                            {timestamp && (
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {job.practiceLeader && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Practice Leader</dt>
                    <dd className="mt-1 text-sm text-gray-900">{job.practiceLeader}</dd>
                  </div>
                )}
                
                {job.practiceLeaderPhone && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <a href={`tel:${job.practiceLeaderPhone}`} className="text-blue-600 hover:underline">
                        {job.practiceLeaderPhone}
                      </a>
                    </dd>
                  </div>
                )}
                
                {job.address && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Address</dt>
                    <dd className="mt-1 text-sm text-gray-900">{job.address}</dd>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        
        <ContractorProvider>
          <JobProgressDialog
            open={progressDialogOpen}
            onOpenChange={setProgressDialogOpen}
            requestId={job.id}
            currentProgress={job.completionPercentage || 0}
            onProgressUpdate={() => {
              // Refresh job details after update
              window.location.reload();
            }}
          />
        </ContractorProvider>
      </main>
    </div>
  );
};

export default ContractorJobDetail;
