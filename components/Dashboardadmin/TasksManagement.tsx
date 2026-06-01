import React, { useState, useMemo } from 'react';
import { 
  Plus, Edit3, Trash2, CheckCircle2, Clock, 
  AlertTriangle, ArrowUpCircle, ThumbsUp, Check, X,
  Info, Sparkles, RefreshCw, Layers, Terminal, 
  Flame, ChevronRight, Tag, BookOpen, AlertCircle
} from 'lucide-react';
import { AppUpdateTask, TaskCategory, TaskStatus, TaskPriority } from '../../types';

interface TasksManagementProps {
  tasks: AppUpdateTask[];
  onUpdateTasks: (tasks: AppUpdateTask[]) => void;
  userRole: 'admin' | 'member';
  currentUserEmail?: string;
}

const CATEGORIES: TaskCategory[] = ['FEATURE', 'OVERLAY', 'SYSTEM', 'WIDGET', 'THEME', 'BUGFIX'];
const STATUSES: TaskStatus[] = ['PLANNED', 'DEVELOPMENT', 'TESTING', 'RERELEASE_TESTING', 'RELEASED', 'CANCELLED'];
const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const TasksManagement: React.FC<TasksManagementProps> = ({
  tasks,
  onUpdateTasks,
  userRole,
  currentUserEmail = 'MEMBER@HUB.COM'
}) => {
  // Filters state
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'PRIORITY' | 'PROGRESS' | 'UPVOTES'>('NEWEST');

  // Modal / Form state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  
  // Field states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('FEATURE');
  const [status, setStatus] = useState<TaskStatus>('PLANNED');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [targetVersion, setTargetVersion] = useState('');
  const [version, setVersion] = useState('');
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [devNotes, setDevNotes] = useState('');

  // Delete safety
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Stats calculation
  const stats = useMemo(() => {
    const total = tasks.length;
    const released = tasks.filter(t => t.status === 'RELEASED').length;
    const active = tasks.filter(t => t.status === 'DEVELOPMENT' || t.status === 'TESTING' || t.status === 'RERELEASE_TESTING').length;
    const planned = tasks.filter(t => t.status === 'PLANNED').length;
    const averageProgress = total > 0 ? Math.round(tasks.reduce((acc, t) => acc + t.progressPercentage, 0) / total) : 0;
    
    return { total, released, active, planned, averageProgress };
  }, [tasks]);

  // Open editor for creation
  const handleOpenCreate = () => {
    setEditingTaskId(null);
    setTitle('');
    setDescription('');
    setCategory('FEATURE');
    setStatus('PLANNED');
    setPriority('MEDIUM');
    setTargetVersion('');
    setVersion('');
    setProgressPercentage(0);
    setDevNotes('');
    setIsEditorOpen(true);
  };

  // Open editor for editing
  const handleOpenEdit = (task: AppUpdateTask) => {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setDescription(task.description);
    setCategory(task.category);
    setStatus(task.status);
    setPriority(task.priority);
    setTargetVersion(task.targetVersion || '');
    setVersion(task.version || '');
    setProgressPercentage(task.progressPercentage);
    setDevNotes(task.devNotes || '');
    setIsEditorOpen(true);
  };

  // Save Task Form Handler
  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('Please fill out the Title and Description fields.');
      return;
    }

    const nowIso = new Date().toISOString();

    if (editingTaskId) {
      // Editing
      const updated = tasks.map(t => {
        if (t.id === editingTaskId) {
          const finalVer = status === 'RELEASED' ? (version || targetVersion || t.version || 'v1.0.0') : undefined;
          return {
            ...t,
            title,
            description,
            category,
            status,
            priority,
            targetVersion: targetVersion || undefined,
            version: finalVer,
            progressPercentage: status === 'RELEASED' ? 100 : progressPercentage,
            devNotes: devNotes || undefined,
            updatedAt: nowIso
          };
        }
        return t;
      });
      onUpdateTasks(updated);
    } else {
      // Creating
      const newTask: AppUpdateTask = {
        id: 'task_' + Date.now().toString(),
        title,
        description,
        category,
        status,
        priority,
        targetVersion: targetVersion || undefined,
        version: status === 'RELEASED' ? (version || targetVersion || 'v1.0.0') : undefined,
        progressPercentage: status === 'RELEASED' ? 100 : progressPercentage,
        devNotes: devNotes || undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
        upvotes: 0,
        acknowledgedBy: []
      };
      onUpdateTasks([newTask, ...tasks]);
    }

    setIsEditorOpen(false);
  };

  // Delete Task Handler
  const handleDeleteTask = (id: string) => {
    onUpdateTasks(tasks.filter(t => t.id !== id));
    setConfirmDeleteId(null);
  };

  // Quick action: Promote Status
  const handlePromoteStatus = (task: AppUpdateTask) => {
    const statusSequence: TaskStatus[] = ['PLANNED', 'DEVELOPMENT', 'TESTING', 'RELEASED'];
    const currentIdx = statusSequence.indexOf(task.status);
    if (currentIdx !== -1 && currentIdx < statusSequence.length - 1) {
      const nextStatus = statusSequence[currentIdx + 1];
      const nextProgress = nextStatus === 'RELEASED' ? 100 : (task.progressPercentage < 25 ? 25 : task.progressPercentage);
      
      const updated = tasks.map(t => {
        if (t.id === task.id) {
          return {
            ...t,
            status: nextStatus,
            progressPercentage: nextProgress,
            version: nextStatus === 'RELEASED' ? (t.targetVersion || 'v3.2.0') : t.version,
            updatedAt: new Date().toISOString()
          };
        }
        return t;
      });
      onUpdateTasks(updated);
    }
  };

  // Quick action: Change progress percentage
  const handleSetProgress = (task: AppUpdateTask, newProg: number) => {
    const finalProg = Math.min(100, Math.max(0, newProg));
    const finalStatus = finalProg === 100 ? 'RELEASED' : task.status === 'RELEASED' ? 'DEVELOPMENT' : task.status;
    const updated = tasks.map(t => {
      if (t.id === task.id) {
        return {
          ...t,
          progressPercentage: finalProg,
          status: finalStatus,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });
    onUpdateTasks(updated);
  };

  // Member Action: Upvote Feature Request
  const handleUpvote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = tasks.map(t => {
      if (t.id === id) {
        return { ...t, upvotes: (t.upvotes || 0) + 1 };
      }
      return t;
    });
    onUpdateTasks(updated);
  };

  // Member Action: Acknowledge Update
  const handleAcknowledge = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const emailUpper = currentUserEmail.toUpperCase();
    const updated = tasks.map(t => {
      if (t.id === id) {
        const CurrentAck = t.acknowledgedBy || [];
        if (CurrentAck.includes(emailUpper)) {
          return t; // Already acknowledged
        }
        return {
          ...t,
          acknowledgedBy: [...CurrentAck, emailUpper]
        };
      }
      return t;
    });
    onUpdateTasks(updated);
  };

  // Filter & Sort Logic
  const filteredTasks = useMemo(() => {
    return tasks
      .filter(t => {
        const matchesStatus = selectedStatus === 'ALL' || t.status === selectedStatus;
        const matchesCategory = selectedCategory === 'ALL' || t.category === selectedCategory;
        const matchesPriority = selectedPriority === 'ALL' || t.priority === selectedPriority;
        
        const textPhrase = searchQuery.toLowerCase();
        const matchesSearch = searchQuery === '' || 
          t.title.toLowerCase().includes(textPhrase) || 
          t.description.toLowerCase().includes(textPhrase) || 
          (t.devNotes && t.devNotes.toLowerCase().includes(textPhrase)) ||
          (t.version && t.version.toLowerCase().includes(textPhrase)) ||
          (t.targetVersion && t.targetVersion.toLowerCase().includes(textPhrase));

        return matchesStatus && matchesCategory && matchesPriority && matchesSearch;
      })
      .sort((a, b) => {
        const isCompletedA = a.status === 'RELEASED' || a.status === 'CANCELLED';
        const isCompletedB = b.status === 'RELEASED' || b.status === 'CANCELLED';
        
        if (isCompletedA !== isCompletedB) {
          return isCompletedA ? 1 : -1;
        }

        if (sortBy === 'NEWEST') {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }
        if (sortBy === 'PROGRESS') {
          return b.progressPercentage - a.progressPercentage;
        }
        if (sortBy === 'UPVOTES') {
          return (b.upvotes || 0) - (a.upvotes || 0);
        }
        if (sortBy === 'PRIORITY') {
          const priorityWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
          return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
        }
        return 0;
      });
  }, [tasks, selectedStatus, selectedCategory, selectedPriority, searchQuery, sortBy]);

  // Color functions for Badges
  const getCategoryColor = (cat: TaskCategory) => {
    switch (cat) {
      case 'OVERLAY': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'SYSTEM': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'WIDGET': return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      case 'THEME': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'BUGFIX': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'FEATURE': return 'bg-green-500/10 text-green-400 border-green-500/20';
      default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  const getPriorityColor = (pr: TaskPriority) => {
    switch (pr) {
      case 'CRITICAL': return 'bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse';
      case 'HIGH': return 'bg-amber-500/20 text-amber-500 border border-amber-500/30';
      case 'MEDIUM': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'LOW': return 'bg-zinc-800 text-zinc-400 border border-white/5';
      default: return 'bg-zinc-800 text-zinc-400';
    }
  };

  const getStatusColor = (st: TaskStatus) => {
    switch (st) {
      case 'RELEASED': return 'text-[#ccff00] bg-[#ccff00]/10 border-[#ccff00]/20';
      case 'DEVELOPMENT': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'TESTING': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'RERELEASE_TESTING': return 'text-magenta-400 bg-magenta-400/10 border-magenta-400/20';
      case 'PLANNED': return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20';
      case 'CANCELLED': return 'text-zinc-500 bg-zinc-950 border-white/5';
      default: return 'text-zinc-400 bg-zinc-800';
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Title Header */}
      <header className="flex flex-col lg:flex-row justify-between items-start mb-12 gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#ccff00]/20 bg-[#ccff00]/5 mb-3">
            <Sparkles size={12} className="text-[#ccff00]" />
            <span className="text-[9px] font-black tracking-[0.2em] text-[#ccff00] uppercase">
              Application Roadmap & Task Registry
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2 uppercase italic text-white">
            System Updates
          </h1>
          <p className="text-zinc-500 text-sm max-w-lg leading-relaxed font-medium">
            Track overlay releases, system upgrades, modular widgets, and technical bugfixes to organize BroHubs core development.
          </p>
        </div>

        {userRole === 'admin' ? (
          <button 
            onClick={handleOpenCreate}
            className="flex items-center gap-2 bg-[#ccff00] text-black px-6 py-3.5 rounded-2xl font-black text-xs tracking-widest uppercase hover:scale-105 transition-all shadow-[0_0_25px_rgba(204,255,0,0.3)] border border-[#ccff00]"
          >
            <Plus size={16} /> REGISTER NEW TASK
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-zinc-900 border border-white/5 px-4 py-3 rounded-2xl">
            <Info size={14} className="text-[#ccff00]" />
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              ROLE: READ-ONLY AUDIENCE (MEMBERS)
            </span>
          </div>
        )}
      </header>

      {/* Stats Summary Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        
        {/* Stat 1 */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
          <p className="text-[9px] font-black text-zinc-500 tracking-widest uppercase mb-1">TOTAL TASKS</p>
          <span className="text-2xl font-black text-white">{stats.total}</span>
          <div className="w-full h-1 bg-zinc-800 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-zinc-500" style={{ width: '100%' }} />
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 hover:border-[#ccff00]/10 transition-all">
          <p className="text-[9px] font-black text-zinc-500 tracking-widest uppercase mb-1">RELEASED & SHIPPED</p>
          <span className="text-2xl font-black text-[#ccff00]">{stats.released}</span>
          <div className="w-full h-1 bg-zinc-800 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-[#ccff00]" style={{ width: `${stats.total > 0 ? (stats.released / stats.total) * 100 : 0}%` }} />
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 hover:border-amber-500/10 transition-all">
          <p className="text-[9px] font-black text-zinc-500 tracking-widest uppercase mb-1">ACTIVE PIPELINE</p>
          <span className="text-2xl font-black text-amber-400">{stats.active}</span>
          <div className="w-full h-1 bg-zinc-800 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-amber-400" style={{ width: `${stats.total > 0 ? (stats.active / stats.total) * 100 : 0}%` }} />
          </div>
        </div>

        {/* Stat 4 */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 hover:border-cyan-500/10 transition-all">
          <p className="text-[9px] font-black text-zinc-500 tracking-widest uppercase mb-1">PLANNED DEFERRAL</p>
          <span className="text-2xl font-black text-cyan-400">{stats.planned}</span>
          <div className="w-full h-1 bg-zinc-800 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-cyan-400" style={{ width: `${stats.total > 0 ? (stats.planned / stats.total) * 100 : 0}%` }} />
          </div>
        </div>

        {/* Stat 5 */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 hover:border-purple-500/10 transition-all col-span-2 md:col-span-1">
          <p className="text-[9px] font-black text-zinc-500 tracking-widest uppercase mb-1">OVERALL DEVELOPMENT</p>
          <span className="text-2xl font-black text-purple-400">{stats.averageProgress}%</span>
          <div className="w-full h-1 bg-zinc-800 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-purple-500" style={{ width: `${stats.averageProgress}%` }} />
          </div>
        </div>

      </div>

      {/* Interactive Controls & Filters Bar */}
      <div className="bg-zinc-950 border border-white/5 rounded-3xl p-6 mb-8 flex flex-col gap-6">
        
        {/* ROW 1: Tabs for Status */}
        <div className="flex flex-wrap gap-2 border-b border-white/5 pb-4">
          <button 
            onClick={() => setSelectedStatus('ALL')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedStatus === 'ALL' ? 'bg-[#ccff00] text-black border-[#ccff00] shadow-[0_0_15px_rgba(204,255,0,0.15)]' : 'bg-transparent border-white/10 text-zinc-500 hover:text-white'}`}
          >
            ALL PIPELINES
          </button>
          
          {STATUSES.map(st => (
            <button 
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedStatus === st ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.15)]' : 'bg-transparent border-white/5 text-zinc-500 hover:text-white hover:border-white/25'}`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* ROW 2: Text Search, Sort, Categories, Priorities */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
          
          {/* Search Bar */}
          <div className="md:col-span-2 relative">
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search update title, details, target, logs..."
              className="w-full bg-black/80 border border-white/10 rounded-xl px-4 py-3 text-xs font-semibold text-white placeholder-zinc-600 focus:border-[#ccff00] outline-none transition-all pl-10"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600">
              <Terminal size={12} className="animate-pulse" />
            </div>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Selector */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-black/80 border border-white/10 rounded-xl p-3 text-xs font-semibold text-zinc-400 focus:border-[#ccff00] outline-none transition-all"
            >
              <option value="ALL">ALL CATEGORIES</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Priority Selector */}
          <div>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full bg-black/80 border border-white/10 rounded-xl p-3 text-xs font-semibold text-zinc-400 focus:border-[#ccff00] outline-none transition-all"
            >
              <option value="ALL">ALL PRIORITIES</option>
              {PRIORITIES.map(pr => (
                <option key={pr} value={pr}>{pr} PRIORITY</option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-black/80 border border-white/10 rounded-xl p-3 text-xs font-semibold text-[#ccff00] bg-zinc-950 focus:border-[#ccff00] outline-none transition-all"
            >
              <option value="NEWEST">SORT: RECENT PATCHES</option>
              <option value="PRIORITY">SORT: HIGHEST PRIORITY</option>
              <option value="PROGRESS">SORT: WORK COMPLETE %</option>
              <option value="UPVOTES">SORT: MEMBER VOTES</option>
            </select>
          </div>

        </div>

      </div>

      {/* Grid of Update Task Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTasks.map((task) => (
          <div 
            key={task.id} 
            className="bg-zinc-950/40 border border-white/5 rounded-3xl p-6 hover:border-white/10 transition-all flex flex-col justify-between group relative overflow-hidden"
          >
            {/* Top Glow Decorator */}
            {task.status === 'RELEASED' && (
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#ccff00]/40 to-transparent shadow-[0_0_15px_#ccff00]" />
            )}
            {task.priority === 'CRITICAL' && (
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-500/40 to-transparent shadow-[0_0_15px_red]" />
            )}

            {/* Header info */}
            <div>
              <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                
                {/* Left tags */}
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-black tracking-widest px-2.5 py-1 rounded-lg border uppercase ${getCategoryColor(task.category)}`}>
                    {task.category}
                  </span>
                  <span className={`text-[8px] font-black tracking-widest px-2.5 py-1 rounded-lg border uppercase ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                  
                  {task.version && (
                    <span className="bg-zinc-900 text-zinc-100 hover:text-[#ccff00] border border-white/10 text-[9px] font-mono font-black px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <Tag size={10} />
                      {task.version}
                    </span>
                  )}
                  {task.targetVersion && !task.version && (
                    <span className="bg-zinc-950 border border-dashed border-zinc-700 text-zinc-500 text-[9px] font-mono font-black px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <Clock size={10} />
                      {task.targetVersion}
                    </span>
                  )}
                </div>

                {/* Status indicator */}
                <span className={`text-[8px] font-black tracking-widest px-2.5 py-1 rounded-lg border uppercase ${getStatusColor(task.status)}`}>
                  {task.status.replace('_', ' ')}
                </span>
                
              </div>

              {/* Title */}
              <h3 className="text-xl font-[900] italic text-zinc-100 hover:text-[#ccff00] transition-colors leading-snug tracking-tighter uppercase mb-2">
                {task.title}
              </h3>

              {/* Timestamp info */}
              <div className="flex items-center gap-2 text-zinc-600 text-[9px] font-black uppercase tracking-wider mb-4 border-b border-white/5 pb-2">
                <span>UPDATED {new Date(task.updatedAt).toLocaleDateString()}</span>
                <span>•</span>
                <span>CREATED {new Date(task.createdAt).toLocaleDateString()}</span>
              </div>

              {/* Description */}
              <p className="text-zinc-400 text-xs font-semibold leading-relaxed mb-5">
                {task.description}
              </p>

              {/* Developer Logs & Notes */}
              {task.devNotes && (
                <div className="bg-black/60 border border-white/5 rounded-2xl p-4 mb-4 relative">
                  <div className="flex items-center gap-2 mb-1.5 text-[8px] font-black text-zinc-500 tracking-widest uppercase">
                    <Terminal size={10} className="text-[#ccff00]" />
                    <span>Developer Logs & Release Notes</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-medium leading-relaxed font-mono">
                    {task.devNotes}
                  </p>
                </div>
              )}

              {/* Progress Slider (Only seen if active / planned) */}
              {task.status !== 'RELEASED' && task.status !== 'CANCELLED' && (
                <div className="mb-6 bg-black/40 border border-white/5 p-4 rounded-2xl">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[9px] font-black text-zinc-500 tracking-widest uppercase">PIPELINE MILESTONE</span>
                    <span className="text-[10px] font-mono font-black text-[#ccff00] bg-[#ccff00]/10 px-1.5 py-0.5 rounded">{task.progressPercentage}% COMPLETE</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden relative">
                    <div 
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#ccff00] to-green-400 shadow-[0_0_10px_#ccff00] transition-all duration-500" 
                      style={{ width: `${task.progressPercentage}%` }}
                    />
                  </div>
                  
                  {/* Admin Direct Drag adjustment */}
                  {userRole === 'admin' && (
                    <div className="flex gap-2 mt-3">
                      {[0, 25, 50, 75, 100].map(val => (
                        <button 
                          key={val}
                          onClick={() => handleSetProgress(task, val)}
                          className={`flex-1 text-[8px] font-black py-1 rounded bg-zinc-900 border border-white/5 hover:bg-zinc-800 transition-colors ${task.progressPercentage === val ? 'text-[#ccff00] border-[#ccff00]/30' : 'text-zinc-600'}`}
                        >
                          {val}%
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5 gap-3 flex-wrap mt-auto">
              
              {/* Member Interaction: Vote / Acknowledge */}
              <div className="flex items-center gap-2">
                
                {/* Vote feature request */}
                <button 
                  onClick={(e) => handleUpvote(task.id, e)}
                  title="Demand / Upvote this update"
                  className="flex items-center gap-2 bg-zinc-900/80 hover:bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 hover:border-[#ccff00]/30 hover:text-white transition-all text-zinc-500"
                >
                  <ThumbsUp size={12} className={task.upvotes && task.upvotes > 0 ? "text-[#ccff00] fill-[#ccff00]" : ""} />
                  <span className={`text-[10px] font-black font-mono ${task.upvotes && task.upvotes > 0 ? 'text-[#ccff00]' : 'text-zinc-400'}`}>
                    {task.upvotes || 0}
                  </span>
                </button>

                {/* Mark as read/acknowledged for released versions */}
                {task.status === 'RELEASED' && (
                  <button 
                    onClick={(e) => handleAcknowledge(task.id, e)}
                    disabled={task.acknowledgedBy?.includes(currentUserEmail.toUpperCase())}
                    className={`flex items-center gap-2 border rounded-xl px-3.5 py-2 text-[10px] font-black tracking-wider transition-all uppercase ${
                      task.acknowledgedBy?.includes(currentUserEmail.toUpperCase()) 
                        ? 'bg-green-500/10 border-green-500/20 text-green-500 cursor-not-allowed' 
                        : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white hover:border-[#ccff00]/30'
                    }`}
                  >
                    <CheckCircle2 size={12} />
                    <span>{task.acknowledgedBy?.includes(currentUserEmail.toUpperCase()) ? 'Acknowledged' : 'Acknowledge Patch'}</span>
                  </button>
                )}

              </div>

              {/* Admin modifications */}
              {userRole === 'admin' ? (
                <div className="flex items-center gap-2">
                  
                  {/* Promote pipeline status quick action */}
                  {task.status !== 'RELEASED' && task.status !== 'CANCELLED' && (
                    <button 
                      onClick={() => handlePromoteStatus(task)}
                      title="Promote Status Step"
                      className="flex items-center gap-1.5 bg-[#ccff00]/10 hover:bg-[#ccff00] text-[#ccff00] hover:text-black border border-[#ccff00]/20 rounded-xl px-4.5 py-2 font-black text-[9px] tracking-widest uppercase transition-all"
                    >
                      <span>PROMOTE</span>
                      <ChevronRight size={12} />
                    </button>
                  )}

                  {/* Edit Core Task */}
                  <button 
                    onClick={() => handleOpenEdit(task)}
                    className="p-2 py-2.5 text-zinc-500 hover:text-white rounded-xl bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 transition-colors"
                    title="Edit Update Specs"
                  >
                    <Edit3 size={14} />
                  </button>

                  {/* Delete with verification safety */}
                  {confirmDeleteId === task.id ? (
                    <div className="flex items-center gap-1 animate-in zoom-in-95">
                      <button 
                        onClick={() => handleDeleteTask(task.id)}
                        className="bg-red-600 text-white rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-red-500"
                      >
                        CONFIRM
                      </button>
                      <button 
                        onClick={() => setConfirmDeleteId(null)}
                        className="bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white p-2 rounded-xl"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setConfirmDeleteId(task.id)}
                      className="p-2 py-2.5 text-red-500 hover:text-red-400 rounded-xl bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 transition-colors"
                      title="Delete Update Entry"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}

                </div>
              ) : (
                /* Member Acknowledgement Count Display */
                task.acknowledgedBy && task.acknowledgedBy.length > 0 && (
                  <div className="flex items-center gap-1 text-[9px] font-bold text-zinc-600 tracking-wider uppercase">
                    <span>{task.acknowledgedBy.length} Broadcasters confirmed receipt</span>
                  </div>
                )
              )}

            </div>
          </div>
        ))}

        {/* Empty State */}
        {filteredTasks.length === 0 && (
          <div className="col-span-1 lg:col-span-2 flex flex-col items-center justify-center py-24 border-2 border-dashed border-white/5 rounded-[40px] bg-white/[0.01]">
            <Layers size={48} className="text-zinc-800 mb-6" />
            <h3 className="text-xl font-black text-zinc-500 uppercase italic tracking-tight mb-2">
              No tasks matched filters
            </h3>
            <p className="text-[10px] font-bold text-zinc-600 tracking-[0.2em] uppercase mb-8 text-center max-w-sm px-6">
              There are no updates registered that match the selected pipeline, category, or search. Adjust variables to recover results.
            </p>
            <button 
              onClick={() => { setSelectedStatus('ALL'); setSelectedCategory('ALL'); setSelectedPriority('ALL'); setSearchQuery(''); }}
              className="bg-white/5 border border-white/10 text-white px-8 py-4 rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-white/10 transition-all"
            >
              RESET FILTER SETTINGS
            </button>
          </div>
        )}
      </div>

      {/* Editor Modal for Adding / Editing Update Tasks */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md animate-in fade-in" onClick={() => setIsEditorOpen(false)} />
          
          <div className="relative w-full max-w-xl bg-zinc-950 border border-white/10 rounded-[32px] overflow-hidden p-8 animate-in zoom-in-95 shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#ccff00]/10 flex items-center justify-center text-[#ccff00]">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white uppercase italic">
                    {editingTaskId ? 'MODIFY UPDATE DICTIONARY' : 'REGISTER UPGRADE SPEC'}
                  </h3>
                  <p className="text-[9px] font-bold text-zinc-500 tracking-widest uppercase">
                    BroHubs Global Node Registry
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditorOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveTask} className="space-y-5 overflow-y-auto pr-2 flex-1 pb-4">
              
              {/* Title field */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase block">Task/Update Title</label>
                <input 
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Honor of Kings standing layout tweaks"
                  className="w-full bg-black border border-white/10 rounded-xl py-3.5 px-4 text-xs font-semibold text-white focus:border-[#ccff00] focus:ring-1 focus:ring-[#ccff00] outline-none transition-all"
                  required
                />
              </div>

              {/* Description field */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase block">Detailed Description / Instructions</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the scope of the update, required files to tweak, or desired UI changes..."
                  className="w-full bg-black border border-white/10 rounded-xl py-3.5 px-4 text-xs font-semibold text-white focus:border-[#ccff00] focus:ring-1 focus:ring-[#ccff00] outline-none transition-all h-24 resize-none"
                  required
                />
              </div>

              {/* Category, Status, Priority Dropdown Grids */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase block">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TaskCategory)}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs font-semibold text-white focus:border-[#ccff00] outline-none"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Pipeline Status */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase block">Pipeline State</label>
                  <select
                    value={status}
                    onChange={(e) => {
                      const newStatus = e.target.value as TaskStatus;
                      setStatus(newStatus);
                      if (newStatus === 'RELEASED') {
                        setProgressPercentage(100);
                      }
                    }}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs font-semibold text-white focus:border-[#ccff00] outline-none"
                  >
                    {STATUSES.map(st => (
                      <option key={st} value={st}>{st.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase block">Resource Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs font-semibold text-white focus:border-[#ccff00] outline-none"
                  >
                    {PRIORITIES.map(pr => (
                      <option key={pr} value={pr}>{pr} PRIORITY</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Version mapping */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Target Version */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase block">Target Version Milestone</label>
                  <input 
                    type="text"
                    value={targetVersion}
                    onChange={(e) => setTargetVersion(e.target.value)}
                    placeholder="e.g., v3.2.0"
                    className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-xs font-semibold text-white focus:border-[#ccff00] outline-none"
                  />
                </div>

                {/* Released Version */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase block">Released Version Patch Tag</label>
                  <input 
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="e.g., v3.1.2-patch3"
                    disabled={status !== 'RELEASED'}
                    className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-xs font-semibold text-white focus:border-[#ccff00] outline-none disabled:opacity-30 disabled:cursor-not-allowed"
                  />
                </div>

              </div>

              {/* Progress percentage slider */}
              {status !== 'RELEASED' && status !== 'CANCELLED' && (
                <div className="space-y-2 bg-black/40 border border-white/5 rounded-2xl p-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase block">Development Progress</label>
                    <span className="text-xs font-mono font-bold text-[#ccff00]">{progressPercentage}% Complete</span>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max="100"
                    value={progressPercentage}
                    onChange={(e) => setProgressPercentage(parseInt(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#ccff00]"
                  />
                  <div className="flex justify-between text-[8px] font-bold text-zinc-600 uppercase tracking-widest">
                    <span>Backlog / Planned</span>
                    <span>Coding</span>
                    <span>Alpha / QA</span>
                    <span>Finished</span>
                  </div>
                </div>
              )}

              {/* Developer Logs & Notes field */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase block">Developer Commit Logs / Release Notes (Optional)</label>
                <textarea 
                  value={devNotes}
                  onChange={(e) => setDevNotes(e.target.value)}
                  placeholder="Insert terminal commits, patch details, or verification requirements here..."
                  className="w-full bg-black border border-white/10 rounded-xl py-3.5 px-4 text-xs font-semibold text-white focus:border-[#ccff00] focus:ring-1 focus:ring-[#ccff00] outline-none transition-all h-20 resize-none font-mono"
                />
              </div>

              {/* Form Actions Footer */}
              <div className="flex items-center gap-4 pt-4 border-t border-white/5 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="flex-1 py-4 bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white rounded-xl font-black text-[10px] tracking-widest uppercase transition-all"
                >
                  CANCEL Specs
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-[#ccff00] text-black rounded-xl font-black text-[10px] tracking-widest uppercase transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(204,255,0,0.2)]"
                >
                  {editingTaskId ? 'APPLY COMMITTED SPECS' : 'PUBLISH UPDATE NODE'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default TasksManagement;
