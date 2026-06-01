import { AppUpdateTask } from '../types';

const STORAGE_KEY_TASKS = 'BROHUBS_UPDATE_TASKS_CLEAN';

const INITIAL_TASKS: AppUpdateTask[] = [
  {
    id: 'rec1',
    title: 'PUBG Mobile Overlay Animation Sync',
    description: 'Fine-tune responsive draft variables (stagger, ease duration keys) in the HUD leaderboard with multicast operators.',
    category: 'OVERLAY',
    status: 'DEVELOPMENT',
    priority: 'CRITICAL',
    targetVersion: 'v3.1.6',
    progressPercentage: 40,
    devNotes: 'Draft states configured. Integrating state handlers directly inside local storage operators.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    upvotes: 0,
    acknowledgedBy: []
  },
  {
    id: 'rec2',
    title: 'Automated Real-time Game Telemetry APIs',
    description: 'Establish customizable API ingestion layers to fetch live score matrices directly from tournament streams.',
    category: 'FEATURE',
    status: 'PLANNED',
    priority: 'HIGH',
    targetVersion: 'v3.2.0',
    progressPercentage: 0,
    devNotes: 'Initial backend structures drafted in pipeline mockups.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    upvotes: 0,
    acknowledgedBy: []
  },
  {
    id: 'rec3',
    title: 'High-Res Logo Canvas Compression Engine',
    description: 'Incorporate client-side image compression layers during file upload to prevent localStorage limits from triggering.',
    category: 'SYSTEM',
    status: 'PLANNED',
    priority: 'MEDIUM',
    targetVersion: 'v3.1.8',
    progressPercentage: 0,
    devNotes: 'Testing dynamic scaling factors using manual canvas triggers.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    upvotes: 0,
    acknowledgedBy: []
  }
];

export const getTasks = async (): Promise<AppUpdateTask[]> => {
  // Simulate stable local network latency
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const saved = localStorage.getItem(STORAGE_KEY_TASKS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved tasks, restoring default tasks', e);
    }
  }
  
  // Save initial seed to localStorage
  localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(INITIAL_TASKS));
  return [...INITIAL_TASKS];
};

export const saveTasks = async (tasks: AppUpdateTask[]): Promise<void> => {
  localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
};
