'use client';

import { useState } from 'react';
import { API_URL, fetchWithRetry } from '../lib/api';

interface Task {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  user_id: number;
  created_at: string;
  updated_at: string;
}

interface TaskItemProps {
  task: Task;
  onUpdate: (updatedTask: Task) => void;
  onDelete: (taskId: number) => void;
  index?: number;
}

export default function TaskItem({ task, onUpdate, onDelete, index = 0 }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [error, setError] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggleComplete = async () => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetchWithRetry(`${API_URL}/api/tasks/${task.id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/signin';
          throw new Error('Session expired. Please log in again.');
        }
        const contentType = response.headers.get('content-type');
        let errorData;
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          const textResponse = await response.text();
          errorData = { detail: textResponse || `HTTP error ${response.status}` };
        }
        throw new Error(errorData.detail || `Failed to update task: ${response.status}`);
      }

      const updatedTask = await response.json();
      onUpdate(updatedTask);
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error: Unable to connect to the server.');
      } else {
        setError(err instanceof Error ? err.message : 'Error updating task');
      }
    } finally {
      setIsToggling(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetchWithRetry(`${API_URL}/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description: description || null,
        }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/signin';
          throw new Error('Session expired. Please log in again.');
        }
        const contentType = response.headers.get('content-type');
        let errorData;
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          const textResponse = await response.text();
          errorData = { detail: textResponse || `HTTP error ${response.status}` };
        }
        throw new Error(errorData.detail || `Failed to update task: ${response.status}`);
      }

      const updatedTask = await response.json();
      onUpdate(updatedTask);
      setIsEditing(false);
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error: Unable to connect to the server.');
      } else {
        setError(err instanceof Error ? err.message : 'Error updating task');
      }
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }
    setIsDeleting(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetchWithRetry(`${API_URL}/api/tasks/${task.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/signin';
          throw new Error('Session expired. Please log in again.');
        }
        const contentType = response.headers.get('content-type');
        let errorData;
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          const textResponse = await response.text();
          errorData = { detail: textResponse || `HTTP error ${response.status}` };
        }
        throw new Error(errorData.detail || `Failed to delete task: ${response.status}`);
      }

      onDelete(task.id);
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error: Unable to connect to the server.');
      } else {
        setError(err instanceof Error ? err.message : 'Error deleting task');
      }
      setIsDeleting(false);
    }
  };

  const delay = Math.min(index * 50, 300);

  if (isEditing) {
    return (
      <li
        className="px-4 sm:px-5 py-4 border-b transition-all duration-200"
        style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-elevated)' }}
      >
        <form onSubmit={handleUpdate} className="space-y-3">
          {error && (
            <div className="text-sm font-medium px-3 py-2 rounded-lg" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }} role="alert">
              {error}
            </div>
          )}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="block w-full px-4 py-2.5 rounded-lg text-sm"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)',
            }}
            required
            aria-label="Edit task title"
            autoFocus
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="block w-full px-4 py-2.5 rounded-lg text-sm resize-none"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)',
            }}
            rows={2}
            aria-label="Edit task description"
            placeholder="Description (optional)"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setTitle(task.title);
                setDescription(task.description || '');
              }}
              className="btn btn-ghost text-xs px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary text-xs px-4 py-2"
            >
              Save Changes
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li
      className="px-4 sm:px-5 py-3.5 border-b transition-all duration-200 group"
      style={{
        borderColor: 'var(--border-primary)',
        animationDelay: `${delay}ms`,
        animationFillMode: 'both',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {error && (
        <div className="text-xs font-medium px-3 py-2 rounded-lg mb-2" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }} role="alert">
          {error}
        </div>
      )}
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className="pt-0.5">
          <input
            id={`task-${task.id}`}
            type="checkbox"
            checked={task.completed}
            onChange={handleToggleComplete}
            disabled={isToggling}
            aria-label={`Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <label
            htmlFor={`task-${task.id}`}
            className="text-sm font-medium cursor-pointer transition-all duration-200 block"
            style={{
              color: task.completed ? 'var(--success)' : 'var(--text-primary)',
              textDecoration: task.completed ? 'line-through' : 'none',
              opacity: task.completed ? 0.7 : 1,
            }}
          >
            {task.title}
          </label>
          {task.description && (
            <p
              className="text-xs mt-0.5 leading-relaxed"
              style={{
                color: task.completed ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                textDecoration: task.completed ? 'line-through' : 'none',
                opacity: task.completed ? 0.6 : 1,
              }}
            >
              {task.description}
            </p>
          )}
        </div>

        {/* Actions - visible on hover (desktop) or always (mobile) */}
        <div className="flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
          <button
            onClick={() => setIsEditing(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
            style={{
              color: 'var(--warning)',
              background: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--warning-light)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            aria-label={`Edit "${task.title}"`}
            title="Edit task"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
            style={{
              color: 'var(--danger)',
              background: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--danger-light)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            aria-label={`Delete "${task.title}"`}
            title="Delete task"
          >
            {isDeleting ? (
              <svg className="w-4 h-4" style={{ animation: 'spin 0.8s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </li>
  );
}
