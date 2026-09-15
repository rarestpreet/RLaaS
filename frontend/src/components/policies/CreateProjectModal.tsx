import React, { useState } from 'react';
import { createProject } from '../../api/projects';
import { Project } from '../../types/project';
import { FolderPlus, X, AlertCircle } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated,
}) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const proj = await createProject({ name });
      onProjectCreated(proj);
      setName('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#09090b]/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-[#18181b] border border-white/[0.12] rounded-2xl shadow-2xl p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#f97316]/20 border border-[#f97316]/40 flex items-center justify-center text-[#f97316]">
              <FolderPlus className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-[#fafafa]">Create Customer Project</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#a1a1aa] hover:text-[#fafafa] p-1 rounded-lg hover:bg-[#27272a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-[#93000a]/20 border border-[#f43f5e]/40 text-xs text-[#ffdad6] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#f43f5e] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#a1a1aa]">Project Identifier Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Core Banking API"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#131315] border border-white/[0.1] text-xs font-sans text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-[#f97316]"
            />
            <span className="text-[11px] text-[#71717a]">
              Projects isolate rate limiting policies and API namespaces.
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#27272a] hover:bg-[#353437] text-xs font-medium text-[#a1a1aa] hover:text-[#fafafa] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-5 py-2 rounded-lg bg-[#f97316] hover:bg-[#fb923c] text-xs font-semibold text-[#09090b] shadow-[0_0_16px_-2px_rgba(249,115,22,0.4)] transition-all disabled:opacity-50"
            >
              {loading ? 'Creating Project...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
