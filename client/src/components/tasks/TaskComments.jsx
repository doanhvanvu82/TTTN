import React, { useState, useEffect } from 'react';
import { useAddCommentMutation, useUpdateCommentMutation, useDeleteCommentMutation, useGetTaskTeamQuery } from '../../redux/slices/api/taskApiSlice';
import { useSelector } from 'react-redux';
import moment from 'moment';
import { toast } from 'sonner';
import ConfirmationDialog from '../ConfirmationDialog';
import socketManager from '../../utils/socket';

const TaskComments = ({ task, onCommentAdded }) => {
  const { user } = useSelector((state) => state.auth);
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentions, setMentions] = useState([]); // userId[]
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [localComments, setLocalComments] = useState([]);

  const [addComment, { isLoading: addingComment }] = useAddCommentMutation();
  const [updateComment, { isLoading: updatingComment }] = useUpdateCommentMutation();
  const [deleteComment, { isLoading: deletingComment }] = useDeleteCommentMutation();
  const { data: taskTeamData } = useGetTaskTeamQuery(task?._id, { skip: !task?._id });
  const taskUsers = taskTeamData?.users || [];

  // Khởi tạo local comments từ task
  useEffect(() => {
    if (task.comments) {
      setLocalComments([...task.comments]);
    }
  }, [task.comments]);

  // Socket.IO connection và event listeners
  useEffect(() => {
    // Kết nối Socket.IO
    const socket = socketManager.connect();
    
    // Join task room
    socketManager.joinTask(task._id);

    // Listen for new comments
    socketManager.onNewComment((data) => {
      if (data.taskId === task._id) {
        setLocalComments(prev => [data.comment, ...prev]);
        toast.success('New comment added');
      }
    });

    // Listen for comment updates
    socketManager.onCommentUpdated((data) => {
      if (data.taskId === task._id) {
        setLocalComments(prev => 
          prev.map(comment => 
            comment._id === data.commentId 
              ? { ...comment, content: data.content, isEdited: data.isEdited, editedAt: data.editedAt }
              : comment
          )
        );
        toast.success('Comment updated');
      }
    });

    // Listen for comment deletions
    socketManager.onCommentDeleted((data) => {
      if (data.taskId === task._id) {
        setLocalComments(prev => prev.filter(comment => comment._id !== data.commentId));
        toast.success('Comment deleted');
      }
    });

    // Cleanup khi component unmount
    return () => {
      socketManager.leaveTask(task._id);
      socketManager.offNewComment();
      socketManager.offCommentUpdated();
      socketManager.offCommentDeleted();
    };
  }, [task._id]);

  // Helper: parse mentions from comment text
  const extractMentionsFromText = (text) => {
    if (!taskUsers) return [];
    // Sử dụng regex để match @username với dấu tiếng Việt
    const regex = /@([^\s]+)/g;
    const found = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      const username = match[1];
      // Tìm user bằng cách so sánh tên (có thể có dấu tiếng Việt)
      const user = taskUsers.find(u => {
        const cleanName = u.name.replace(/\s/g, '').toLowerCase();
        const cleanUsername = username.toLowerCase();
        return cleanName.includes(cleanUsername) || cleanUsername.includes(cleanName);
      });
      if (user && !found.includes(user._id)) {
        found.push(user._id);
      }
    }
    return found;
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    // Sử dụng state mentions đã được cập nhật
    try {
      await addComment({
        taskId: task._id,
        content: newComment,
        mentions: mentions,
      }).unwrap();
      setNewComment('');
      setMentions([]);
      toast.success('Comment added successfully');
      if (onCommentAdded) onCommentAdded();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to add comment');
    }
  };

  const handleUpdateComment = async (commentId) => {
    if (!editContent.trim()) return;

    try {
      await updateComment({
        taskId: task._id,
        commentId,
        content: editContent,
      }).unwrap();

      setEditingComment(null);
      setEditContent('');
      toast.success('Comment updated successfully');
      if (onCommentAdded) onCommentAdded();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    setCommentToDelete(commentId);
    setConfirmDeleteOpen(true);
  };

  const confirmDeleteComment = async () => {
    if (!commentToDelete) return;
    
    try {
      await deleteComment({
        taskId: task._id,
        commentId: commentToDelete,
      }).unwrap();

      toast.success('Comment deleted successfully');
      if (onCommentAdded) onCommentAdded();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to delete comment');
    } finally {
      setConfirmDeleteOpen(false);
      setCommentToDelete(null);
    }
  };

  const handleCommentChange = (e) => {
    const value = e.target.value;
    setNewComment(value);
    setCursorPosition(e.target.selectionStart);

    // Check for @ symbol to show mentions
    const lastAtSymbol = value.lastIndexOf('@');
    if (lastAtSymbol !== -1 && lastAtSymbol < e.target.selectionStart) {
      const filter = value.substring(lastAtSymbol + 1, e.target.selectionStart);
      setMentionFilter(filter);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (newComment.trim() && !addingComment) {
        handleSubmitComment(e);
      }
    }
  };

  const insertMention = (userName, userId) => {
    const lastAtSymbol = newComment.lastIndexOf('@');
    const beforeMention = newComment.substring(0, lastAtSymbol);
    const afterMention = newComment.substring(cursorPosition);
    const mentionTag = '@' + userName.replace(/\s/g, '') + ' ';
    const updatedComment = beforeMention + mentionTag + afterMention;
    setNewComment(updatedComment);
    setShowMentions(false);
    setMentionFilter('');
    // Thêm userId vào mentions nếu chưa có
    setMentions(prev => prev.includes(userId) ? prev : [...prev, userId]);
  };

  // Khi xóa @username khỏi comment, cũng xóa userId khỏi mentions
  useEffect(() => {
    if (!taskUsers) return;
    const currentMentionIds = extractMentionsFromText(newComment);
    setMentions(prev => prev.filter(id => currentMentionIds.includes(id)));
    // eslint-disable-next-line
  }, [newComment]);

  const highlightMentions = (content) => {
    if (!content) return content;
    
    // Thay thế \n thành <br> để hiển thị dòng mới
    let processedContent = content.replace(/\n/g, '<br>');
    
    // Highlight mentions
    processedContent = processedContent.replace(/@(\w+)/g, (match, username) => {
      const mentionedUser = task.team?.find(member => 
        member.name.toLowerCase().includes(username.toLowerCase())
      );
      
      if (mentionedUser) {
        return `<span class="bg-blue-100 text-blue-800 px-1 rounded">${match}</span>`;
      }
      return match;
    });
    
    return processedContent;
  };

  const canEditComment = (comment) => {
    return comment.author._id === user._id || user.isProjectManager;
  };

  const canDeleteComment = (comment) => {
    return comment.author._id === user._id || user.isProjectManager;
  };

  return (
    <div className="space-y-4">
      {/* Add Comment Form */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <form onSubmit={handleSubmitComment} className="relative">
          <textarea
            value={newComment}
            onChange={handleCommentChange}
            onFocus={(e) => setCursorPosition(e.target.selectionStart)}
            onSelect={(e) => setCursorPosition(e.target.selectionStart)}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment... Use @ to mention team members"
            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
            disabled={addingComment}
          />
          
          {/* Mentions Dropdown */}
          {showMentions && taskUsers && (
            <div className="absolute bottom-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto z-10">
              {taskUsers
                .filter(member => 
                  member._id !== user._id &&
                  member.name.toLowerCase().includes(mentionFilter.toLowerCase())
                )
                .map(member => (
                  <button
                    key={member._id}
                    type="button"
                    onClick={() => insertMention(member.name, member._id)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                  >
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-xs font-medium">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span>{member.name}</span>
                  </button>
                ))}
            </div>
          )}
          
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-gray-500">
              Press Enter to submit, Shift+Enter for new line
            </span>
            <button
              type="submit"
              disabled={addingComment || !newComment.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingComment ? 'Adding...' : 'Add Comment'}
            </button>
          </div>
        </form>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {localComments && localComments.length > 0 ? (
          // Sắp xếp comments từ mới nhất đến cũ nhất
          [...localComments]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map((comment) => (
            <div key={comment._id} className="bg-white p-4 rounded-lg border">
              {editingComment === comment._id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateComment(comment._id)}
                      disabled={updatingComment}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {updatingComment ? 'Updating...' : 'Update'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingComment(null);
                        setEditContent('');
                      }}
                      className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {comment.author.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{comment.author.name}</p>
                        <p className="text-sm text-gray-500">
                          {moment(comment.date).fromNow()}
                          {comment.isEdited && ' (edited)'}
                        </p>
                      </div>
                    </div>
                    
                    {(canEditComment(comment) || canDeleteComment(comment)) && (
                      <div className="flex gap-1">
                        {canEditComment(comment) && (
                          <button
                            onClick={() => {
                              setEditingComment(comment._id);
                              setEditContent(comment.content);
                            }}
                            className="text-gray-500 hover:text-blue-600"
                          >
                            Edit
                          </button>
                        )}
                        {canDeleteComment(comment) && (
                          <button
                            onClick={() => handleDeleteComment(comment._id)}
                            disabled={deletingComment}
                            className="text-gray-500 hover:text-red-600 disabled:opacity-50"
                          >
                            {deletingComment ? 'Deleting...' : 'Delete'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div 
                    className="mt-2 text-gray-700"
                    dangerouslySetInnerHTML={{ 
                      __html: highlightMentions(comment.content) 
                    }}
                  />
                  
                  {comment.mentions && comment.mentions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-sm text-gray-500">Mentioned:</span>
                      {comment.mentions.map((mention) => (
                        <span
                          key={mention._id}
                          className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded"
                        >
                          {mention.name}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            No comments yet. Be the first to comment!
          </div>
        )}
      </div>

      <ConfirmationDialog
        open={confirmDeleteOpen}
        setOpen={setConfirmDeleteOpen}
        msg="Are you sure you want to delete this comment?"
        onClick={confirmDeleteComment}
        type="delete"
      />
    </div>
  );
};

export default TaskComments; 