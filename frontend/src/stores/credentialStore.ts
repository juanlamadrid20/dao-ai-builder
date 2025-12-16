import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CredentialType = 'obo' | 'manual_sp' | 'manual_pat';

export interface CredentialConfig {
  type: CredentialType;
  client_id?: string;
  client_secret?: string;
  pat?: string;
}

interface CredentialState {
  credentialType: CredentialType;
  manualClientId: string;
  manualClientSecret: string;
  manualPat: string;
  
  // Actions
  setCredentialType: (type: CredentialType) => void;
  setManualClientId: (id: string) => void;
  setManualClientSecret: (secret: string) => void;
  setManualPat: (pat: string) => void;
  
  // Get current credentials config
  getCredentials: () => CredentialConfig;
  
  // Check if credentials are configured
  hasCredentials: () => boolean;
}

export const useCredentialStore = create<CredentialState>()(
  persist(
    (set, get) => ({
      credentialType: 'obo',
      manualClientId: '',
      manualClientSecret: '',
      manualPat: '',
      
      setCredentialType: (type) => set({ credentialType: type }),
      setManualClientId: (id) => set({ manualClientId: id }),
      setManualClientSecret: (secret) => set({ manualClientSecret: secret }),
      setManualPat: (pat) => set({ manualPat: pat }),
      
      getCredentials: () => {
        const state = get();
        const creds: CredentialConfig = { type: state.credentialType };
        
        if (state.credentialType === 'manual_sp') {
          creds.client_id = state.manualClientId;
          creds.client_secret = state.manualClientSecret;
        } else if (state.credentialType === 'manual_pat') {
          creds.pat = state.manualPat;
        }
        
        return creds;
      },
      
      hasCredentials: () => {
        const state = get();
        if (state.credentialType === 'obo') return true;
        if (state.credentialType === 'manual_sp') {
          return !!(state.manualClientId && state.manualClientSecret);
        }
        if (state.credentialType === 'manual_pat') {
          return !!state.manualPat;
        }
        return false;
      },
    }),
    {
      name: 'credential-storage',
    }
  )
);



