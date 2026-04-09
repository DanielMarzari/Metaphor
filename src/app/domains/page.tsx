'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ChevronDown, Plus, X, Trash2, Box, GitBranch } from 'lucide-react';

interface DomainClass {
  id: number; name: string; parent_id: number | null; parent_name: string | null;
  description: string; child_count: number; property_count: number;
}

interface DomainProperty {
  id: number; domain_class_id: number; name: string; description: string;
  owner_class?: string; owner_class_id?: number; depth?: number;
}

export default function DomainsPage() {
  const [domains, setDomains] = useState<DomainClass[]>([]);
  const [selected, setSelected] = useState<DomainClass | null>(null);
  const [properties, setProperties] = useState<{ own: DomainProperty[]; inherited: DomainProperty[] }>({ own: [], inherited: [] });
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [newName, setNewName] = useState('');
  const [newParent, setNewParent] = useState<number | null>(null);
  const [newDesc, setNewDesc] = useState('');
  const [newPropName, setNewPropName] = useState('');
  const [newPropDesc, setNewPropDesc] = useState('');

  // Edit state
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editParent, setEditParent] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => { loadDomains(); }, []);

  async function loadDomains() {
    const res = await fetch('/api/domain-classes');
    setDomains(await res.json());
  }

  async function selectDomain(d: DomainClass) {
    setSelected(d);
    setEditing(false);
    setEditName(d.name);
    setEditDesc(d.description || '');
    setEditParent(d.parent_id);
    const res = await fetch(`/api/domain-classes/${d.id}/properties`);
    setProperties(await res.json());
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch('/api/domain-classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), parent_id: newParent, description: newDesc }),
    });
    if (res.ok) {
      setNewName(''); setNewParent(null); setNewDesc(''); setShowForm(false);
      loadDomains();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to create');
    }
  }

  async function handleUpdate() {
    if (!selected) return;
    await fetch(`/api/domain-classes/${selected.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, parent_id: editParent, description: editDesc }),
    });
    setEditing(false);
    loadDomains();
    // Re-select to refresh
    const res = await fetch('/api/domain-classes');
    const all = await res.json();
    const updated = all.find((d: DomainClass) => d.id === selected.id);
    if (updated) selectDomain(updated);
  }

  async function handleDelete(d: DomainClass) {
    if (!confirm(`Delete "${d.name}"? Children will become root classes.`)) return;
    await fetch(`/api/domain-classes/${d.id}`, { method: 'DELETE' });
    if (selected?.id === d.id) { setSelected(null); setProperties({ own: [], inherited: [] }); }
    loadDomains();
  }

  async function handleAddProperty(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !newPropName.trim()) return;
    await fetch(`/api/domain-classes/${selected.id}/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newPropName.trim(), description: newPropDesc }),
    });
    setNewPropName(''); setNewPropDesc('');
    const res = await fetch(`/api/domain-classes/${selected.id}/properties`);
    setProperties(await res.json());
    loadDomains();
  }

  async function handleDeleteProperty(propId: number) {
    if (!selected) return;
    await fetch(`/api/domain-properties/${propId}`, { method: 'DELETE' });
    const res = await fetch(`/api/domain-classes/${selected.id}/properties`);
    setProperties(await res.json());
    loadDomains();
  }

  function toggleExpand(id: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Build tree from flat list
  const roots = domains.filter(d => !d.parent_id);
  const childrenOf = (id: number) => domains.filter(d => d.parent_id === id);

  function renderNode(d: DomainClass, depth = 0): React.ReactNode {
    const children = childrenOf(d.id);
    const isExpanded = expanded.has(d.id);
    const isSelected = selected?.id === d.id;

    return (
      <div key={d.id}>
        <div
          className="flex items-center gap-1 py-1.5 px-2 rounded cursor-pointer transition-colors"
          style={{
            paddingLeft: `${depth * 20 + 8}px`,
            backgroundColor: isSelected ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : 'transparent',
          }}
          onClick={() => selectDomain(d)}
        >
          {children.length > 0 ? (
            <button onClick={(e) => { e.stopPropagation(); toggleExpand(d.id); }} className="p-0.5">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} /> : <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />}
            </button>
          ) : (
            <span className="w-4.5" />
          )}
          <Box className="w-3.5 h-3.5 shrink-0" style={{ color: depth === 0 ? 'var(--accent)' : 'var(--primary)' }} />
          <span className="text-sm font-medium truncate">{d.name}</span>
          {d.property_count > 0 && (
            <span className="text-[10px] ml-auto" style={{ color: 'var(--muted)' }}>{d.property_count}p</span>
          )}
        </div>
        {isExpanded && children.map(c => renderNode(c, depth + 1))}
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:opacity-70"><ChevronLeft className="w-5 h-5" /></Link>
          <GitBranch className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          <h1 className="text-lg font-bold">Domain Classes</h1>
          <span className="text-sm" style={{ color: 'var(--muted)' }}>({domains.length})</span>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--primary)' }}>
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'New Class'}
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* Create Form */}
        {showForm && (
          <form onSubmit={handleCreate} className="mb-6 p-5 rounded-xl border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h2 className="font-semibold mb-3">New Domain Class</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="CLASS NAME (e.g. CONTAINER)" required
                className="p-2 border rounded-lg text-sm font-mono uppercase"
                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
              <select value={newParent || ''} onChange={e => setNewParent(e.target.value ? parseInt(e.target.value) : null)}
                className="p-2 border rounded-lg text-sm"
                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
                <option value="">— No parent (root class) —</option>
                {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)}
                placeholder="Description..." className="p-2 border rounded-lg text-sm sm:col-span-2"
                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
            </div>
            <button type="submit" className="mt-3 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--primary)' }}>
              Create
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tree panel */}
          <div className="lg:col-span-1 rounded-xl border p-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--muted)' }}>Hierarchy</h3>
            {domains.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--muted)' }}>No domain classes yet.</p>
            ) : (
              <div className="space-y-0.5">
                {roots.map(d => renderNode(d))}
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-2 rounded-xl border p-5" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            {!selected ? (
              <p className="text-center py-12" style={{ color: 'var(--muted)' }}>Select a domain class to view details</p>
            ) : editing ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">Edit Class</h2>
                  <button onClick={() => setEditing(false)} className="text-sm" style={{ color: 'var(--muted)' }}>Cancel</button>
                </div>
                <input value={editName} onChange={e => setEditName(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm font-mono uppercase"
                  style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
                <select value={editParent || ''} onChange={e => setEditParent(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full p-2 border rounded-lg text-sm"
                  style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
                  <option value="">— No parent (root) —</option>
                  {domains.filter(d => d.id !== selected.id).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2}
                  placeholder="Description..."
                  className="w-full p-2 border rounded-lg text-sm"
                  style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
                <button onClick={handleUpdate} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--primary)' }}>
                  Save
                </button>
              </div>
            ) : (
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-1 text-xs mb-1" style={{ color: 'var(--muted)' }}>
                      {(() => {
                        const chain: DomainClass[] = [];
                        let current: DomainClass | undefined = selected;
                        while (current) {
                          chain.unshift(current);
                          current = domains.find(d => d.id === current!.parent_id);
                        }
                        return chain.map((c, i) => (
                          <span key={c.id} className="flex items-center gap-1">
                            {i > 0 && <span>→</span>}
                            <button onClick={() => selectDomain(c)}
                              className={c.id === selected.id ? 'font-semibold' : 'hover:underline'}>
                              {c.name}
                            </button>
                          </span>
                        ));
                      })()}
                    </div>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{selected.name}</h2>
                    {selected.description && <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{selected.description}</p>}
                    {selected.parent_name && (
                      <p className="text-xs mt-1">
                        <span style={{ color: 'var(--muted)' }}>extends </span>
                        <span className="font-medium" style={{ color: 'var(--primary)' }}>{selected.parent_name}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditing(true)} className="px-3 py-1.5 rounded-lg border text-xs"
                      style={{ borderColor: 'var(--border)' }}>Edit</button>
                    <button onClick={() => handleDelete(selected)} className="px-3 py-1.5 rounded-lg border text-xs"
                      style={{ borderColor: 'var(--border)', color: 'var(--disputed)' }}>Delete</button>
                  </div>
                </div>

                {/* Properties */}
                <div className="mt-6">
                  <h3 className="text-sm font-semibold mb-3">Properties</h3>
                  <div className="space-y-1.5">
                    {properties.inherited.map(p => (
                      <div key={`${p.owner_class_id}-${p.id}`}
                        className="flex items-center justify-between px-3 py-2 rounded-lg text-sm"
                        style={{
                          backgroundColor: p.owner_class_id === selected.id ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'var(--background)',
                        }}>
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-sm">.{p.name}</code>
                          {p.description && <span className="text-xs" style={{ color: 'var(--muted)' }}>— {p.description}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          {p.owner_class_id !== selected.id ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--muted)' }}>
                              from {p.owner_class}
                            </span>
                          ) : (
                            <button onClick={() => handleDeleteProperty(p.id)}
                              className="opacity-30 hover:opacity-100 transition-opacity">
                              <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--disputed)' }} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {properties.inherited.length === 0 && (
                      <p className="text-sm py-2" style={{ color: 'var(--muted)' }}>No properties defined.</p>
                    )}
                  </div>

                  {/* Add property */}
                  <form onSubmit={handleAddProperty} className="flex items-center gap-2 mt-3">
                    <input type="text" value={newPropName} onChange={e => setNewPropName(e.target.value)}
                      placeholder="property name" className="flex-1 p-2 border rounded-lg text-sm font-mono"
                      style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
                    <input type="text" value={newPropDesc} onChange={e => setNewPropDesc(e.target.value)}
                      placeholder="description" className="flex-1 p-2 border rounded-lg text-sm"
                      style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
                    <button type="submit" className="p-2 rounded-lg text-white" style={{ backgroundColor: 'var(--primary)' }}>
                      <Plus className="w-4 h-4" />
                    </button>
                  </form>
                </div>

                {/* Children */}
                {selected.child_count > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold mb-3">Subclasses</h3>
                    <div className="space-y-1">
                      {childrenOf(selected.id).map(c => (
                        <button key={c.id} onClick={() => selectDomain(c)}
                          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-left hover:shadow-sm"
                          style={{ backgroundColor: 'var(--background)' }}>
                          <Box className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                          <span className="font-medium">{c.name}</span>
                          <span className="text-xs ml-auto" style={{ color: 'var(--muted)' }}>
                            extends {selected.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick create child */}
                <div className="mt-4">
                  <button onClick={() => { setShowForm(true); setNewParent(selected.id); }}
                    className="text-xs flex items-center gap-1 hover:underline" style={{ color: 'var(--primary)' }}>
                    <Plus className="w-3 h-3" /> Add subclass of {selected.name}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
