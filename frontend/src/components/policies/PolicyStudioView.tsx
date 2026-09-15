import React, { useState, useEffect } from 'react';
import { fetchProjects } from '../../api/projects';
import { fetchPoliciesByProject, updatePolicyStatus, deletePolicy } from '../../api/policies';
import { Project } from '../../types/project';
import { Policy, PolicyStatus } from '../../types/policy';
import { CreateProjectModal } from './CreateProjectModal';
import { PolicyBuilderModal } from './PolicyBuilderModal';
import { 
  Layers, 
  FolderPlus, 
  Plus, 
  Trash2, 
  Power, 
  RotateCw, 
  ShieldCheck, 
  ShieldAlert, 
  Cpu, 
  Folder, 
  AlertCircle,
  ExternalLink 
} from 'lucide-react';

export const PolicyStudioView: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);

  const [loadingProjects, setLoadingProjects] = useState<boolean>(true);
  const [loadingPolicies, setLoadingPolicies] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [createPolicyModalOpen, setCreatePolicyModalOpen] = useState(false);

  // Load projects
  const loadProjects = async () => {
    setLoadingProjects(true);
    setError(null);
    try {
      const data = await fetchProjects();
      setProjects(data);
      if (data.length > 0) {
        // preserve or select first
        setSelectedProject(prev => prev && data.some(p => p.id === prev.id) ? prev : data[0]);
      } else {
        setSelectedProject(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // Load policies whenever selectedProject changes
  useEffect(() => {
    if (!selectedProject) {
      setPolicies([]);
      return;
    }

    const loadPolicies = async () => {
      setLoadingPolicies(true);
      setError(null);
      try {
        const data = await fetchPoliciesByProject(selectedProject.id);
        setPolicies(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load policies for selected project');
      } finally {
        setLoadingPolicies(false);
      }
    };

    loadPolicies();
  }, [selectedProject]);

  const handleStatusToggle = async (policy: Policy) => {
    const nextStatus: PolicyStatus = policy.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updatePolicyStatus(policy.id, nextStatus);
      setPolicies(prev =>
        prev.map(p => (p.id === policy.id ? { ...p, status: nextStatus } : p))
      );
    } catch (err: any) {
      alert(`Could not toggle policy status: ${err.message}`);
    }
  };

  const handleDeletePolicy = async (policyId: string, policyName: string) => {
    if (!window.confirm(`Are you sure you want to delete policy "${policyName}"?`)) {
      return;
    }
    try {
      await deletePolicy(policyId);
      setPolicies(prev => prev.filter(p => p.id !== policyId));
    } catch (err: any) {
      alert(`Could not delete policy: ${err.message}`);
    }
  };

  return (
    <div className="w-full py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col gap-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-[#1f1f21] text-[#fb923c] font-semibold border border-white/[0.06]">
              Policy Engine
            </span>
            <span className="text-xs font-mono text-[#71717a]">/</span>
            <span className="text-xs font-mono text-[#a1a1aa]">Namespace & Rule Orchestration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#fafafa]">
            Rate Limiting Policy Studio & Projects
          </h1>
          <p className="text-xs sm:text-sm text-[#a1a1aa]">
            Define distributed rate limits, burst parameters, and failure semantics evaluated at global edge runtimes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setCreateProjectModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#18181b] hover:bg-[#27272a] text-[#fafafa] border border-white/[0.08] text-xs font-medium transition-colors"
          >
            <FolderPlus className="w-4 h-4 text-[#f97316]" />
            <span>+ New Project</span>
          </button>

          <button
            disabled={!selectedProject}
            onClick={() => setCreatePolicyModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f97316] hover:bg-[#fb923c] active:bg-[#ea580c] text-[#09090b] text-xs font-semibold shadow-[0_0_20px_-2px_rgba(249,115,22,0.4)] transition-all disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Add Rate Limit Policy</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#93000a]/20 border border-[#f43f5e]/40 text-xs text-[#ffdad6] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#f43f5e] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Project Selector Shelf */}
      <div className="bg-[#18181b] border border-white/[0.08] rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#131315] border border-white/[0.08] flex items-center justify-center text-[#fb923c]">
            <Folder className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-mono text-[#a1a1aa] uppercase">Target Project Namespace</span>
            <div className="flex items-center gap-2 mt-0.5">
              {loadingProjects ? (
                <span className="text-xs text-[#71717a] font-mono">Loading projects...</span>
              ) : projects.length === 0 ? (
                <span className="text-xs text-[#a1a1aa] italic">No projects found. Please create one.</span>
              ) : (
                <select
                  value={selectedProject?.id || ''}
                  onChange={e => {
                    const found = projects.find(p => p.id === e.target.value);
                    if (found) setSelectedProject(found);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#131315] border border-white/[0.1] text-xs font-semibold text-[#fafafa] focus:outline-none focus:border-[#f97316]"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.policyCount ?? 0} policies)
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {selectedProject && (
          <div className="flex items-center gap-4 text-xs font-mono text-[#a1a1aa]">
            <div>
              <span>Project ID: </span>
              <code className="text-[#fb923c]">{selectedProject.id.slice(0, 13)}...</code>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#4edea3]"></span>
              <span className="text-[#fafafa] font-semibold">{selectedProject.status}</span>
            </div>
          </div>
        )}
      </div>

      {/* Policies List / Cards */}
      <div className="bg-[#18181b] border border-white/[0.08] rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#f97316]" />
            <span className="text-sm font-semibold text-[#fafafa]">
              Configured Rate Limiting Policies
            </span>
          </div>
          <span className="text-xs font-mono text-[#a1a1aa]">
            {policies.length} Active Rule(s)
          </span>
        </div>

        {loadingPolicies ? (
          <div className="p-12 flex flex-col items-center justify-center text-center text-[#a1a1aa] gap-2">
            <RotateCw className="w-6 h-6 animate-spin text-[#f97316]" />
            <span className="text-xs font-mono">Loading rate limit policies...</span>
          </div>
        ) : !selectedProject ? (
          <div className="p-12 text-center text-[#a1a1aa] text-xs font-mono">
            Please create or select a project to manage its policies.
          </div>
        ) : policies.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center text-[#a1a1aa] gap-3">
            <Layers className="w-10 h-10 opacity-30 text-[#fafafa]" />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-[#fafafa]">No Policies Configured</span>
              <p className="text-xs text-[#71717a] max-w-sm">
                Add an API rate limiting policy (Token Bucket or Anchored Window) for this project to start throttling requests.
              </p>
            </div>
            <button
              onClick={() => setCreatePolicyModalOpen(true)}
              className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-[#f97316] text-[#09090b] font-semibold text-xs hover:bg-[#fb923c] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Policy</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] bg-[#131315] text-[#a1a1aa] font-mono uppercase text-[11px]">
                  <th className="py-3 px-4">Policy & Endpoint</th>
                  <th className="py-3 px-4">Algorithm & Parameters</th>
                  <th className="py-3 px-4">Key Strategy</th>
                  <th className="py-3 px-4">Fail Mode</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-[#e5e1e4]">
                {policies.map(policy => (
                  <tr key={policy.id} className="hover:bg-[#1f1f21] transition-colors">
                    {/* Policy Name & Endpoint */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-[#fafafa]">{policy.name}</span>
                        <code className="text-xs font-mono text-[#fb923c] mt-0.5">
                          {policy.endpoint}
                        </code>
                      </div>
                    </td>

                    {/* Algorithm & Config */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 font-mono font-semibold text-[#fafafa] text-xs">
                          <Cpu className="w-3.5 h-3.5 text-[#f97316]" />
                          {policy.algorithmType === 'TOKEN_BUCKET' ? 'Token Bucket' : 'Anchored Window'}
                        </span>
                        <span className="text-[11px] font-mono text-[#a1a1aa]">
                          {policy.algorithmType === 'TOKEN_BUCKET' ? (
                            <>
                              cap: {(policy.algorithmConfig as any).capacity} · refill: {(policy.algorithmConfig as any).refillRate}/{(policy.algorithmConfig as any).refillIntervalMs}ms
                            </>
                          ) : (
                            <>
                              limit: {(policy.algorithmConfig as any).limit} / {(policy.algorithmConfig as any).windowMs}ms
                            </>
                          )}
                        </span>
                      </div>
                    </td>

                    {/* Key Strategy */}
                    <td className="py-3.5 px-4 font-mono">
                      <span className="px-2 py-0.5 rounded bg-[#131315] text-[#fb923c] border border-white/[0.06] font-semibold text-[10px]">
                        {policy.keyStrategy.type}
                        {policy.keyStrategy.headerName && ` (${policy.keyStrategy.headerName})`}
                      </span>
                    </td>

                    {/* Fail Mode */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                          policy.failMode === 'FAIL_OPEN'
                            ? 'bg-[#4edea3]/15 text-[#4edea3]'
                            : 'bg-[#f43f5e]/15 text-[#f43f5e]'
                        }`}
                      >
                        {policy.failMode === 'FAIL_OPEN' ? (
                          <ShieldCheck className="w-3 h-3" />
                        ) : (
                          <ShieldAlert className="w-3 h-3" />
                        )}
                        {policy.failMode}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                          policy.status === 'ACTIVE'
                            ? 'bg-[#4edea3]/15 text-[#4edea3] border border-[#4edea3]/30'
                            : 'bg-[#fb923c]/15 text-[#fb923c] border border-[#fb923c]/30'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            policy.status === 'ACTIVE' ? 'bg-[#4edea3]' : 'bg-[#fb923c]'
                          }`}
                        ></span>
                        {policy.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleStatusToggle(policy)}
                          title={policy.status === 'ACTIVE' ? 'Deactivate Policy' : 'Activate Policy'}
                          className="p-1.5 rounded-lg bg-[#27272a] hover:bg-[#353437] text-[#a1a1aa] hover:text-[#fb923c] border border-white/[0.08] transition-colors"
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePolicy(policy.id, policy.name)}
                          title="Delete Policy"
                          className="p-1.5 rounded-lg bg-[#93000a]/20 hover:bg-[#93000a]/40 text-[#ffb4ab] border border-[#f43f5e]/30 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Project & Policy Modals */}
      <CreateProjectModal
        isOpen={createProjectModalOpen}
        onClose={() => setCreateProjectModalOpen(false)}
        onProjectCreated={newProj => {
          setProjects(prev => [newProj, ...prev]);
          setSelectedProject(newProj);
        }}
      />

      {selectedProject && (
        <PolicyBuilderModal
          isOpen={createPolicyModalOpen}
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          onClose={() => setCreatePolicyModalOpen(false)}
          onPolicyCreated={newPol => {
            setPolicies(prev => [newPol, ...prev]);
          }}
        />
      )}
    </div>
  );
};
