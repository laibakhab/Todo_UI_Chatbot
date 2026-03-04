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

interface AddTaskFormProps {
  onTaskAdded?: (task: Task) => void;
}

export default function AddTaskForm({ onTaskAdded }: AddTaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please log in.');
      }

      const response = await fetchWithRetry(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
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
        throw new Error(errorData.detail || `Failed to create task: ${response.status}`);
      }

      const newTask = await response.json();
      setTitle('');
      setDescription('');
      setShowDescription(false);

      if (onTaskAdded) {
        onTaskAdded(newTask);
      }
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error: Unable to connect to the server. Please check your connection and try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Error creating task');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--accent-primary-light)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </div>
        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          Add New Task
        </h3>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2"
            style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
            role="alert"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label htmlFor="title" className="sr-only">Task title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-sm"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-primary)',
              }}
              placeholder="What needs to be done?"
              disabled={loading}
              aria-label="Task title"
              aria-required="true"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowDescription(!showDescription)}
              className="px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5"
              style={{
                background: showDescription ? 'var(--accent-primary-light)' : 'var(--bg-tertiary)',
                color: showDescription ? 'var(--accent-primary)' : 'var(--text-secondary)',
                border: '1px solid var(--border-primary)',
              }}
              aria-label={showDescription ? 'Hide description field' : 'Add a description'}
              title="Toggle description"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="17" y1="10" x2="3" y2="10"/>
                <line x1="21" y1="6" x2="3" y2="6"/>
                <line x1="21" y1="14" x2="3" y2="14"/>
                <line x1="17" y1="18" x2="3" y2="18"/>
              </svg>
              <span className="hidden sm:inline">Details</span>
            </button>

            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="btn btn-primary px-5 py-3 text-sm"
              aria-label="Add task"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" style={{ animation: 'spin 0.8s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/>
                  </svg>
                  Adding...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add Task
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Expandable description */}
        {showDescription && (
          <div className="mt-3 fade-in-up">
            <label htmlFor="description" className="sr-only">Task description</label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-sm resize-none"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-primary)',
              }}
              placeholder="Add more details about this task..."
              disabled={loading}
              aria-label="Task description"
            />
          </div>
        )}
      </form>
    </div>
  );
}
