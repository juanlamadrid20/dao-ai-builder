/**
 * Store for managing deployment state.
 * Persists deployment progress across modal opens/closes.
 */
import { create } from 'zustand';

export interface DeploymentStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
}

export interface DeploymentStatus {
  id: string;
  status: 'starting' | 'creating_agent' | 'deploying' | 'completed' | 'failed';
  type: 'quick' | 'full';
  started_at: string;
  completed_at?: string;
  steps: DeploymentStep[];
  current_step: number;
  error?: string;
  error_trace?: string;
  result?: {
    endpoint_name: string;
    model_name: string;
    message: string;
  };
}

interface DeploymentState {
  // Deployment tracking
  deploymentId: string | null;
  deploymentStatus: DeploymentStatus | null;
  isDeploying: boolean;
  selectedOption: 'quick' | 'full';
  
  // Error state
  error: string | null;
  
  // Actions
  startDeployment: (type: 'quick' | 'full') => DeploymentStatus;
  setDeploymentId: (id: string) => void;
  setDeploymentStatus: (status: DeploymentStatus) => void;
  setError: (error: string) => void;
  completeDeployment: () => void;
  failDeployment: (error: string, errorTrace?: string) => void;
  reset: () => void;
  canStartNewDeployment: () => boolean;
}

export const useDeploymentStore = create<DeploymentState>((set, get) => ({
  deploymentId: null,
  deploymentStatus: null,
  isDeploying: false,
  selectedOption: 'quick',
  error: null,

  startDeployment: (type) => {
    const initialStatus: DeploymentStatus = {
      id: 'pending',
      status: 'starting',
      type,
      started_at: new Date().toISOString(),
      steps: [
        { name: 'validate', status: 'running' },
        { name: 'create_agent', status: 'pending' },
        { name: 'deploy_agent', status: 'pending' },
      ],
      current_step: 0,
    };
    
    set({
      isDeploying: true,
      selectedOption: type,
      deploymentStatus: initialStatus,
      error: null,
    });
    
    return initialStatus;
  },

  setDeploymentId: (id) => {
    set({ deploymentId: id });
  },

  setDeploymentStatus: (status) => {
    set({ deploymentStatus: status });
    
    // Update isDeploying based on status
    if (status.status === 'completed' || status.status === 'failed') {
      set({ isDeploying: false });
    }
  },

  setError: (error) => {
    set({ error, isDeploying: false });
  },

  completeDeployment: () => {
    set({ isDeploying: false });
  },

  failDeployment: (error, errorTrace) => {
    set((state) => ({
      isDeploying: false,
      error,
      deploymentStatus: state.deploymentStatus ? {
        ...state.deploymentStatus,
        status: 'failed',
        error,
        error_trace: errorTrace,
        steps: state.deploymentStatus.steps.map((step, idx) => 
          idx === state.deploymentStatus!.current_step 
            ? { ...step, status: 'failed', error } 
            : step
        ),
      } : null,
    }));
  },

  reset: () => {
    // Only allow reset if not currently deploying
    if (get().isDeploying) return;
    
    set({
      deploymentId: null,
      deploymentStatus: null,
      isDeploying: false,
      error: null,
    });
  },

  canStartNewDeployment: () => {
    const state = get();
    // Can start new deployment if:
    // 1. Not currently deploying
    // 2. No existing deployment OR existing deployment is complete/failed
    if (state.isDeploying) return false;
    if (!state.deploymentStatus) return true;
    return state.deploymentStatus.status === 'completed' || state.deploymentStatus.status === 'failed';
  },
}));

