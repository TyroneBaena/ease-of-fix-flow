import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Send, AlertCircle } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";

interface PublicCommentSectionProps {
  requestId: string;
  comments?: any[];
}

/**
 * Public comment section that works without authentication
 * Shows read-only view for public users
 */
export const PublicCommentSection = ({ requestId, comments = [] }: PublicCommentSectionProps) => {
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [localComments, setLocalComments] = useState(comments);
  const [error, setError] = useState('');

  // Update local comments when props change
  React.useEffect(() => {
    setLocalComments(comments);
  }, [comments]);

  const handleAddComment = async () => {
    if (!comment.trim()) {
      setError('Please enter a comment');
      return;
    }
    
    if (!userName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (comment.length > 2000) {
      setError('Comment must be less than 2000 characters');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      console.log('📝 Adding public comment for request:', requestId);
      
      const response = await fetch('https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/add-public-comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          text: comment.trim(),
          userName: userName.trim(),
          userRole: 'Public User'
        })
      });

      const result = await response.json();
      console.log('📦 Comment response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add comment');
      }

      // Add the new comment to local state
      setLocalComments(prev => [...prev, result.comment]);
      
      // Clear form
      setComment('');
      setError('');
      
      console.log('✅ Comment added successfully');
      
    } catch (error) {
      console.error('❌ Error adding comment:', error);
      setError(error.message || 'Failed to add comment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get initials from a user name
  const getInitials = (name: string): string => {
    if (!name) return '?';
    
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="p-6">
      <h2 className="font-semibold mb-6 flex items-center">
        <MessageCircle className="h-4 w-4 mr-2" />
        Comments & Activity ({localComments.length})
      </h2>
      
      <div className="space-y-6">
        {isLoading ? (
          // Loading skeleton
          Array(2).fill(0).map((_, index) => (
            <div key={index} className="flex">
              <Skeleton className="h-8 w-8 rounded-full mr-4" />
              <div className="flex-1">
                <div className="flex items-baseline">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-20 ml-auto" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4 mt-1" />
              </div>
            </div>
          ))
        ) : localComments.length > 0 ? (
          localComments.map(item => (
            <div key={item.id} className="flex">
              <Avatar className="h-8 w-8 mr-4">
                <AvatarImage src={item.avatar} alt={item.user} />
                <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
                  {getInitials(item.user)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-baseline">
                  <h3 className="font-medium">{item.user}</h3>
                  <span className="ml-2 text-xs text-gray-500">{item.role}</span>
                  <span className="ml-auto text-xs text-gray-500">{item.timestamp}</span>
                </div>
                <p className="text-gray-700 mt-1">{item.text}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-500">No comments yet</p>
            <p className="text-sm text-gray-400">
              {localComments.length === 0 
                ? "Be the first to add a comment!" 
                : `Found ${localComments.length} comments but none are displaying`}
            </p>
          </div>
        )}
      </div>
      
      <div className="mt-8">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center">
            <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
            <span className="text-red-600 text-sm">{error}</span>
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="userName">Your Name</Label>
            <Input
              id="userName"
              placeholder="Enter your name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              disabled={isLoading}
              maxLength={100}
            />
          </div>
          
          <div>
            <Label htmlFor="comment">Add a comment</Label>
            <div className="mt-2">
              <Textarea
                id="comment"
                placeholder="Type your comment here..."
                className="min-h-[100px]"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isLoading}
                maxLength={2000}
              />
              <div className="text-xs text-gray-500 mt-1">
                {comment.length}/2000 characters
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <Button 
            onClick={handleAddComment}
            disabled={isLoading || !comment.trim() || !userName.trim()}
            className="bg-blue-500 hover:bg-blue-600"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Adding Comment...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Add Comment
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};