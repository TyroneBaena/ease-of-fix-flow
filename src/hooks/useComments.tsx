
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from '@/lib/toast';

export type Comment = {
  id: string;
  user: string;
  role: string;
  avatar: string;
  text: string;
  timestamp: string;
};

export type DatabaseComment = {
  id: string;
  user_id: string;
  request_id: string;
  text: string;
  user_name: string;
  user_role: string;
  created_at: string;
};

export function useComments(requestId: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useUserContext();

  // Function to format database comments to our Comment type
  const formatComments = useCallback((dbComments: DatabaseComment[]): Comment[] => {
    return dbComments.map(comment => ({
      id: comment.id,
      user: comment.user_name,
      role: comment.user_role,
      avatar: '', // Default avatar
      text: comment.text,
      timestamp: formatTimestamp(comment.created_at)
    }));
  }, []);

  // Format timestamp for display
  const formatTimestamp = (timestamp: string): string => {
    const commentDate = new Date(timestamp);
    const now = new Date();
    
    const diffMs = now.getTime() - commentDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return commentDate.toLocaleDateString();
    }
  };

  // Fetch comments for the request
  const fetchComments = useCallback(async () => {
    if (!requestId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching comments:', error);
        toast.error('Failed to fetch comments');
        setComments([]);
      } else {
        console.log('Fetched comments:', data);
        setComments(formatComments(data as DatabaseComment[]));
      }
    } catch (error) {
      console.error('Unexpected error fetching comments:', error);
      toast.error('An error occurred while fetching comments');
    } finally {
      setIsLoading(false);
    }
  }, [requestId, formatComments]);

  // Add a new comment
  const addComment = useCallback(async (text: string) => {
    if (!requestId || !currentUser) {
      toast.error('You must be logged in to add comments');
      return false;
    }
    
    try {
      // Get the current authenticated user directly from Supabase
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user || !user.id) {
        console.error('Auth error:', authError);
        toast.error('Authentication error. Please log in again.');
        return false;
      }
      
      console.log('Authenticated user:', user);
      console.log('User ID from auth:', user.id);
      console.log('User ID type:', typeof user.id);
      console.log('Current user context:', currentUser);
      
      // Supabase auth user.id is always a string, so we can use it directly
      const userIdString = String(user.id);
      
      console.log('Final user ID string:', userIdString);
      console.log('Final user ID string type:', typeof userIdString);
      
      console.log('Calling insert_comment function with:', {
        p_user_id: userIdString,
        p_request_id: requestId,
        p_text: text.trim(),
        p_user_name: currentUser.name || currentUser.email || 'Anonymous',
        p_user_role: currentUser.role || 'User'
      });
      
      // Use the RPC function with proper UUID parameters
      const { data, error } = await supabase.rpc('insert_comment', {
        p_user_id: userIdString,
        p_request_id: requestId,
        p_text: text.trim(),
        p_user_name: currentUser.name || currentUser.email || 'Anonymous',
        p_user_role: currentUser.role || 'User'
      });
      
      if (error) {
        console.error('Error adding comment:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        toast.error(`Failed to add comment: ${error.message}`);
        return false;
      }
      
      console.log('Comment added successfully via RPC:', data);
      
      // Refresh comments to get the new one
      await fetchComments();
      toast.success('Comment added');
      return true;
    } catch (error) {
      console.error('Unexpected error adding comment:', error);
      toast.error('An error occurred while adding your comment');
      return false;
    }
  }, [requestId, currentUser, fetchComments]);

  // Fetch comments on mount and when requestId changes
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return {
    comments,
    isLoading,
    addComment,
    refreshComments: fetchComments
  };
}
