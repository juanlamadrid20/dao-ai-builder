import { useState, useEffect } from 'react';
import { Folder, FileText, ChevronRight, ArrowLeft, Loader2, Github, Upload, AlertCircle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

interface GitHubItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url: string | null;
}

interface GitHubImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportFile: (content: string, fileName: string) => void;
  onLocalUpload: () => void;
}

interface GitHubConfig {
  repo: string;
  branch: string;
  path: string;
}

const DEFAULT_CONFIG: GitHubConfig = {
  repo: 'natefleming/dao-ai',
  branch: 'main',
  path: 'config',
};

export default function GitHubImportModal({ 
  isOpen, 
  onClose, 
  onImportFile,
  onLocalUpload 
}: GitHubImportModalProps) {
  const [mode, setMode] = useState<'choose' | 'github'>('choose');
  const [gitHubConfig, setGitHubConfig] = useState<GitHubConfig>(DEFAULT_CONFIG);
  const [currentPath, setCurrentPath] = useState(DEFAULT_CONFIG.path);
  const [items, setItems] = useState<GitHubItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Fetch GitHub config from backend on mount
  useEffect(() => {
    const fetchConfig = async () => {
      setLoadingConfig(true);
      try {
        const response = await fetch('/api/github-config');
        if (response.ok) {
          const config = await response.json();
          setGitHubConfig(config);
          setCurrentPath(config.path);
        }
      } catch (err) {
        console.warn('Failed to fetch GitHub config, using defaults:', err);
      } finally {
        setLoadingConfig(false);
      }
    };
    fetchConfig();
  }, []);

  // Fetch directory contents when path changes
  useEffect(() => {
    if (mode !== 'github' || loadingConfig) return;
    
    const fetchContents = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const url = `https://api.github.com/repos/${gitHubConfig.repo}/contents/${currentPath}?ref=${gitHubConfig.branch}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Path not found in repository');
          } else if (response.status === 403) {
            throw new Error('API rate limit exceeded. Please try again later.');
          }
          throw new Error(`GitHub API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Filter to only show directories and YAML files
        const filtered = (Array.isArray(data) ? data : [data])
          .filter((item: GitHubItem) => 
            item.type === 'dir' || 
            item.name.endsWith('.yaml') || 
            item.name.endsWith('.yml')
          )
          .sort((a: GitHubItem, b: GitHubItem) => {
            // Directories first, then files
            if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
        
        setItems(filtered);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch repository contents');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchContents();
  }, [currentPath, gitHubConfig.repo, gitHubConfig.branch, mode, loadingConfig]);

  const handleItemClick = async (item: GitHubItem) => {
    if (item.type === 'dir') {
      setCurrentPath(item.path);
    } else if (item.download_url) {
      // Download and import the file
      setDownloading(item.name);
      try {
        const response = await fetch(item.download_url);
        if (!response.ok) {
          throw new Error('Failed to download file');
        }
        const content = await response.text();
        onImportFile(content, item.name);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to download file');
      } finally {
        setDownloading(null);
      }
    }
  };

  const handleBack = () => {
    const parts = currentPath.split('/');
    if (parts.length > 1) {
      parts.pop();
      setCurrentPath(parts.join('/'));
    }
  };

  const handleLocalUploadClick = () => {
    onLocalUpload();
    onClose();
  };

  const resetToChoose = () => {
    setMode('choose');
    setCurrentPath(gitHubConfig.path);
    setError(null);
  };

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode('choose');
      setCurrentPath(gitHubConfig.path);
      setError(null);
    }
  }, [isOpen, gitHubConfig.path]);

  const pathParts = currentPath.split('/');
  const baseParts = gitHubConfig.path.split('/');
  const canGoBack = pathParts.length > baseParts.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Configuration"
      size="lg"
    >
      {mode === 'choose' ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Choose how you want to import a configuration file:
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleLocalUploadClick}
              className="flex flex-col items-center gap-3 p-6 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600 transition-colors"
            >
              <div className="p-3 rounded-full bg-blue-500/20">
                <Upload className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-medium text-slate-100">Upload File</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Import a YAML file from your computer
                </p>
              </div>
            </button>
            
            <button
              onClick={() => setMode('github')}
              className="flex flex-col items-center gap-3 p-6 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600 transition-colors"
            >
              <div className="p-3 rounded-full bg-purple-500/20">
                <Github className="w-6 h-6 text-purple-400" />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-medium text-slate-100">Browse GitHub</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Load a template from the dao-ai repository
                </p>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header with back button */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={resetToChoose}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Github className="w-4 h-4" />
              <span>{gitHubConfig.repo}</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-slate-300">{currentPath}</span>
            </div>
          </div>
          
          {/* Navigation breadcrumb */}
          {canGoBack && (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to parent directory
            </button>
          )}
          
          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          
          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
              <span className="ml-2 text-slate-400">Loading...</span>
            </div>
          )}
          
          {/* File list */}
          {!loading && items.length > 0 && (
            <div className="max-h-80 overflow-y-auto space-y-1 border border-slate-700 rounded-lg p-2">
              {items.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleItemClick(item)}
                  disabled={downloading !== null}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                    downloading === item.name
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  {downloading === item.name ? (
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  ) : item.type === 'dir' ? (
                    <Folder className="w-4 h-4 text-amber-400" />
                  ) : (
                    <FileText className="w-4 h-4 text-blue-400" />
                  )}
                  <span className="text-sm">{item.name}</span>
                  {item.type === 'dir' && (
                    <ChevronRight className="w-4 h-4 text-slate-500 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          )}
          
          {/* Empty state */}
          {!loading && !error && items.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              No YAML files found in this directory
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

