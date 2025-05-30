
import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Send } from 'lucide-react';
import { useComments } from '@/hooks/useComments';
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { useRequestCommentsSubscription } from '@/hooks/request-detail/useRequestCommentsSubscription';
import { toast } from '@/lib/toast';

interface CommentSectionProps {
  requestId: string;
}

export const CommentSection = ({ requestId }: CommentSectionProps) => {
  const [comment, setComment] = useState('');
  const { comments, isLoading, addComment, refreshComments } = useComments(requestId);
  
  // Subscribe to real-time comment updates
  useRequestCommentsSubscription(requestId, refreshComments);

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    
    const success = await addComment(comment);
    if (success) {
      setComment('');
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
        Comments & Activity
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
        ) : comments.length > 0 ? (
          comments.map(item => (
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
            <p className="text-sm text-gray-400">Be the first to leave a comment</p>
          </div>
        )}
      </div>
      
      <div className="mt-8">
        <Label htmlFor="comment">Add a comment</Label>
        <div className="mt-2 flex">
          <Textarea
            id="comment"
            placeholder="Type your comment here..."
            className="min-h-[100px]"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        <div className="mt-2 flex justify-end">
          <Button 
            onClick={handleAddComment}
            className="bg-blue-500 hover:bg-blue-600"
            disabled={!comment.trim()}
          >
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </Card>
  );
};
