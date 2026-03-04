'use client';

import { useState, useEffect, useMemo } from 'react';
import TaskItem from './TaskItem';
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

type FilterType = 'all' | 'active' | 'completed';
type SortType = 'newest' | 'oldest' | 'title';

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('newest');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetchWithRetry(`${API_URL}/api/tasks`, {
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
        throw new Error(errorData.detail || `Failed to fetch tasks: ${response.status}`);
      }

      const data = await response.json();
      setTasks(data);
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error: Unable to connect to the server. Please check your connection and try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Error fetching tasks');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(tasks.map(task => task.id === updatedTask.id ? updatedTask : task));
  };

  const handleTaskDelete = (taskId: number) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    }

    // Filter by status
    if (filter === 'active') result = result.filter(t => !t.completed);
    if (filter === 'completed') result = result.filter(t => t.completed);

    // Sort
    if (sort === 'newest') result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (sort === 'oldest') result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    if (sort === 'title') result.sort((a, b) => a.title.localeCompare(b.title));

    return result;
  }, [tasks, search, filter, sort]);

  const counts = useMemo(() => ({
    all: tasks.length,
    active: tasks.filter(t => !t.completed).length,
    completed: tasks.filter(t => t.completed).length,
  }), [tasks]);

  if (loading) {
    return (
      <div className="p-6 sm:p-8">
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div
            className="w-10 h-10 border-[3px] rounded-full"
            style={{
              borderColor: 'var(--border-primary)',
              borderTopColor: 'var(--accent-primary)',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Loading your tasks...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div
          className="px-4 py-3 rounded-lg text-sm font-medium flex items-start gap-3"
          style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
          role="alert"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <p className="font-semibold">Failed to load tasks</p>
            <p className="mt-1 opacity-80">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="p-6 sm:p-8">
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--bg-tertiary)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="2"/>
              <line x1="9" y1="12" x2="15" y2="12"/>
              <line x1="9" y1="16" x2="13" y2="16"/>
            </svg>
          </div>
          <div className="text-center">
            <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              No tasks yet
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Create your first task to get started
            </p>
          </div>
        </div>
      </div>
    );
  }

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Done' },
  ];

  return (
    <div>
      {/* Toolbar */}
      <div
        className="p-4 sm:p-5 border-b flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"
        style={{ borderColor: 'var(--border-primary)' }}
      >
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          >
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)',
            }}
            aria-label="Search tasks"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter pills */}
          <div
            className="flex rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--border-primary)' }}
            role="tablist"
            aria-label="Filter tasks"
          >
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                role="tab"
                aria-selected={filter === f.key}
                className="px-3 py-2 text-xs font-semibold transition-all duration-200 flex items-center gap-1.5"
                style={{
                  background: filter === f.key ? 'var(--accent-primary)' : 'transparent',
                  color: filter === f.key ? 'white' : 'var(--text-secondary)',
                }}
              >
                {f.label}
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{
                    background: filter === f.key ? 'rgba(255,255,255,0.2)' : 'var(--bg-tertiary)',
                    color: filter === f.key ? 'white' : 'var(--text-tertiary)',
                  }}
                >
                  {counts[f.key]}
                </span>
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortType)}
            className="px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-secondary)',
            }}
            aria-label="Sort tasks"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Task items */}
      {filteredTasks.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            No tasks match your {search ? 'search' : 'filter'}
          </p>
        </div>
      ) : (
        <ul role="list" aria-label="Task list">
          {filteredTasks.map((task, index) => (
            <TaskItem
              key={task.id}
              task={task}
              onUpdate={handleTaskUpdate}
              onDelete={handleTaskDelete}
              index={index}
            />
          ))}
        </ul>
      )}

      {/* Footer stats */}
      <div
        className="px-5 py-3 border-t text-xs font-medium flex justify-between"
        style={{ borderColor: 'var(--border-primary)', color: 'var(--text-tertiary)' }}
      >
        <span>{counts.active} remaining</span>
        <span>{counts.completed} completed</span>
      </div>
    </div>
  );
}
