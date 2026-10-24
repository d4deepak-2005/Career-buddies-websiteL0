import React, { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { adminFetch } from '../../../utils/adminAuth';
import { ImageUploadField } from './ImageUploadField';
import { CardGridSkeleton } from '../../common/Skeleton';

export interface FieldConfig {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'tags' | 'number' | 'select' | 'checkbox' | 'json' | 'image' | 'mentor-select';
  options?: string[];
  placeholder?: string;
  // For mentor-select: map mentor fields -> form fields to auto-fill
  autoFill?: Record<string, string>; // e.g. { photoUrl: 'speakerPhotoUrl', name: 'speakerName' }
}

interface RecordListEditorProps {
  // e.g. '/api/people' — admin routes are `${apiBase}/admin[...]`
  apiBase: string;
  labelSingular: string;
  fields: FieldConfig[];
  emptyRecord: Record<string, any>;
  titleField?: string;
  subtitleField?: string;
  // Only load/show records matching this filter (e.g. { role: 'founder' }).
  // New records are created pre-filled with these values too.
  filter?: Record<string, any>;
  // Field holding an image URL — shown as a thumbnail on each record card.
  imageField?: string;
  // Callback when items are loaded or modified
  onItemsChange?: (items: Record<string, any>[]) => void;
  // Optional extra content or action buttons rendered per row (e.g. portal status & invite)
  renderItemExtra?: (item: Record<string, any>, refresh: () => void) => React.ReactNode;
}

const inputClass = 'w-full px-3';
const labelClass = 'block text-[12px] font-medium text-[var(--admin-text)] mb-1.5';

function toTagsString(value: unknown): string {
  return Array.isArray(value) ? value.join(', ') : '';
}

function fromTagsString(value: string): string[] {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

export const RecordListEditor: React.FC<RecordListEditorProps> = ({
  apiBase,
  labelSingular,
  fields,
  emptyRecord,
  titleField = 'name',
  subtitleField,
  filter,
  imageField,
  onItemsChange,
  renderItemExtra,
}) => {
  const [items, setItems] = useState<Record<string, any>[]>([]);

  useEffect(() => {
    onItemsChange?.(items);
  }, [items, onItemsChange]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [jsonDrafts, setJsonDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);
  // Mentor options for mentor-select fields
  const [mentorOptions, setMentorOptions] = useState<Record<string, any>[]>([]);

  const hasMentorSelect = fields.some((f) => f.type === 'mentor-select');
  useEffect(() => {
    if (!hasMentorSelect) return;
    adminFetch('/api/mentors/admin')
      .then((r) => r.json())
      .then((d) => { if (d.success) setMentorOptions(d.items || []); })
      .catch(() => {});
  }, [hasMentorSelect]);

  const jsonFieldKeys = fields.filter((f) => f.type === 'json').map((f) => f.key);

  const seedJsonDrafts = (record: Record<string, any>) => {
    const drafts: Record<string, string> = {};
    jsonFieldKeys.forEach((key) => {
      drafts[key] = JSON.stringify(record[key] ?? [], null, 2);
    });
    setJsonDrafts(drafts);
  };

  const matchesFilter = (item: Record<string, any>) =>
    !filter ||
    Object.entries(filter).every(([k, v]) =>
      Array.isArray(v) ? v.includes(item[k]) : item[k] === v
    );

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await adminFetch(`${apiBase}/admin`);
      const data = await res.json();
      if (data.success) {
        setItems((data.items || []).filter(matchesFilter));
      }
    } catch (err) {
      console.error(`Failed to load ${labelSingular} records:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  const openAddForm = () => {
    setEditingId(null);
    const filterDefaults = filter
      ? Object.fromEntries(Object.entries(filter).filter(([, v]) => !Array.isArray(v)))
      : {};
    const record = { ...emptyRecord, ...filterDefaults };
    setForm(record);
    seedJsonDrafts(record);
    setError('');
    setIsFormOpen(true);
  };

  const openEditForm = (item: Record<string, any>) => {
    setEditingId(item._id);
    setForm({ ...item });
    seedJsonDrafts(item);
    setError('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setError('');
  };

  const updateField = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const payload = { ...form };
    delete payload._id;
    delete payload.portalStatus;
    delete payload.createdAt;
    delete payload.updatedAt;
    delete payload.__v;
    for (const key of jsonFieldKeys) {
      try {
        payload[key] = JSON.parse(jsonDrafts[key] || '[]');
      } catch (err) {
        setError(`"${key}" is not valid JSON — fix it before saving.`);
        return;
      }
    }

    try {
      const res = editingId
        ? await adminFetch(`${apiBase}/admin/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await adminFetch(`${apiBase}/admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...payload,
              displayOrder: items.length,
            }),
          });
      const data = await res.json();
      if (data.success) {
        setIsFormOpen(false);
        setEditingId(null);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2000);
        fetchItems();
      } else {
        setError(data.error || `Unable to save ${labelSingular}.`);
      }
    } catch (err) {
      setError('Unable to reach the server. Please try again.');
    }
  };

  const handleDelete = async (item: Record<string, any>) => {
    if (!window.confirm(`Delete "${item[titleField]}"? This cannot be undone.`)) {
      return;
    }
    try {
      await adminFetch(`${apiBase}/admin/${item._id}`, { method: 'DELETE' });
      fetchItems();
    } catch (err) {
      console.error(`Failed to delete ${labelSingular}:`, err);
    }
  };

  const toggleVisible = async (item: Record<string, any>) => {
    try {
      await adminFetch(`${apiBase}/admin/${item._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible: !item.visible }),
      });
      fetchItems();
    } catch (err) {
      console.error(`Failed to toggle visibility:`, err);
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const a = items[index];
    const b = items[targetIndex];

    try {
      await Promise.all([
        adminFetch(`${apiBase}/admin/${a._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayOrder: b.displayOrder }),
        }),
        adminFetch(`${apiBase}/admin/${b._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayOrder: a.displayOrder }),
        }),
      ]);
      fetchItems();
    } catch (err) {
      console.error('Failed to reorder:', err);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          {savedFlash && (
            <div className="inline-flex items-center gap-1.5 text-[12px] font-medium admin-tone-ok px-2.5 py-1 rounded-md">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Saved
            </div>
          )}
        </div>
        <button type="button" onClick={openAddForm} className="admin-btn">
          <Plus className="w-3.5 h-3.5" />
          Add {labelSingular}
        </button>
      </div>

      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="p-5 rounded-2xl bg-[var(--admin-soft)] border border-[var(--admin-border)] flex flex-col gap-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[var(--admin-text)]">
              {editingId ? `Edit ${labelSingular}` : `New ${labelSingular}`}
            </h3>
            <button aria-label="Close"
              type="button"
              onClick={closeForm}
              className="w-8 h-8 rounded-full bg-[var(--admin-page)] text-[var(--admin-muted)] hover:text-[var(--admin-text)] flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((field) => {
              if (field.type === 'textarea') {
                return (
                  <div key={field.key} className="sm:col-span-2">
                    <label htmlFor={`rle-${field.key}`} className={labelClass}>{field.label}</label>
                    <textarea id={`rle-${field.key}`}
                      rows={3}
                      value={form[field.key] || ''}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className={inputClass}
                    />
                  </div>
                );
              }
              if (field.type === 'tags') {
                return (
                  <div key={field.key} className="sm:col-span-2">
                    <label htmlFor={`rle-${field.key}`} className={labelClass}>{field.label} (comma-separated)</label>
                    <input id={`rle-${field.key}`}
                      type="text"
                      value={toTagsString(form[field.key])}
                      onChange={(e) => updateField(field.key, fromTagsString(e.target.value))}
                      placeholder={field.placeholder}
                      className={inputClass}
                    />
                  </div>
                );
              }
              if (field.type === 'image') {
                return (
                  <ImageUploadField
                    key={field.key}
                    label={field.label}
                    value={form[field.key] || ''}
                    onChange={(url) => updateField(field.key, url)}
                  />
                );
              }
              if (field.type === 'checkbox') {
                return (
                  <div key={field.key} className="flex items-end">
                    <label className="flex items-center gap-2 text-[13px] text-[var(--admin-text)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!form[field.key]}
                        onChange={(e) => updateField(field.key, e.target.checked)}
                      />
                      {field.label}
                    </label>
                  </div>
                );
              }
              if (field.type === 'json') {
                return (
                  <div key={field.key} className="sm:col-span-2">
                    <label htmlFor={`rle-${field.key}`} className={labelClass}>{field.label} (JSON)</label>
                    <textarea id={`rle-${field.key}`}
                      rows={6}
                      value={jsonDrafts[field.key] ?? ''}
                      onChange={(e) =>
                        setJsonDrafts((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      placeholder={field.placeholder}
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                );
              }
              if (field.type === 'mentor-select') {
                const selectedMentor = mentorOptions.find(
                  (m) => String(m._id) === String(form[field.key])
                );
                return (
                  <div key={field.key}>
                    <label htmlFor={`rle-${field.key}`} className={labelClass}>
                      {field.label}
                    </label>
                    <select
                      id={`rle-${field.key}`}
                      value={form[field.key] || ''}
                      onChange={(e) => {
                        const mentorId = e.target.value;
                        updateField(field.key, mentorId);
                        // Auto-fill mapped fields when a mentor is selected
                        if (mentorId && field.autoFill) {
                          const mentor = mentorOptions.find((m) => String(m._id) === mentorId);
                          if (mentor) {
                            Object.entries(field.autoFill).forEach(([mentorField, formField]) => {
                              updateField(formField, mentor[mentorField] ?? '');
                            });
                          }
                        }
                      }}
                      className={inputClass}
                      style={{ backgroundImage: 'none' }}
                    >
                      <option value="">— No mentor linked —</option>
                      {mentorOptions.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name}{m.designation ? ` · ${m.designation}` : ''}{m.company ? ` @ ${m.company}` : ''}
                        </option>
                      ))}
                    </select>
                    {selectedMentor && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '8px',
                        padding: '8px 12px',
                        background: 'rgba(0,40,105,0.06)',
                        borderRadius: '10px',
                        border: '1px solid rgba(0,40,105,0.12)',
                      }}>
                        {selectedMentor.photoUrl && (
                          <img
                            src={selectedMentor.photoUrl}
                            alt={selectedMentor.name}
                            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                          />
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#002869', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {selectedMentor.name}
                          </div>
                          {selectedMentor.designation && (
                            <div style={{ fontSize: 11, color: '#666a76', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {selectedMentor.designation}{selectedMentor.company ? ` @ ${selectedMentor.company}` : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
              if (field.type === 'select') {
                return (
                  <div key={field.key}>
                    <label htmlFor={`rle-${field.key}`} className={labelClass}>{field.label}</label>
                    <select id={`rle-${field.key}`}
                      value={form[field.key] || ''}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      className={inputClass}
                    >
                      {(field.options || []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }
              return (
                <div key={field.key}>
                  <label htmlFor={`rle-${field.key}`} className={labelClass}>{field.label}</label>
                  <input id={`rle-${field.key}`}
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={form[field.key] ?? ''}
                    onChange={(e) =>
                      updateField(
                        field.key,
                        field.type === 'number' ? Number(e.target.value) : e.target.value
                      )
                    }
                    placeholder={field.placeholder}
                    className={inputClass}
                  />
                </div>
              );
            })}
          </div>

          {error && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-700 text-[12px] font-medium">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--admin-border)]">
            <button type="button" onClick={closeForm} className="admin-btn">
              Cancel
            </button>
            <button type="submit" className="admin-btn">
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <CardGridSkeleton count={4} />
      ) : items.length === 0 ? (
        <p className="text-[13px] text-[var(--admin-muted)] py-10 text-center">
          No {labelSingular.toLowerCase()} records yet. Add one to get started.
        </p>
      ) : (
        <div className="rounded-2xl border border-[var(--admin-border)] overflow-hidden">
          {items.map((item, index) => (
            <div
              key={item._id}
              className={`px-4 py-3.5 flex items-center gap-3 border-b border-[var(--admin-border)] last:border-b-0 ${
                item.visible === false ? 'opacity-60' : ''
              }`}
            >
              {imageField && (
                <div className="w-10 h-10 shrink-0 rounded-lg bg-[var(--admin-soft)] overflow-hidden">
                  {item[imageField] ? (
                    <img src={item[imageField]} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="text-[13px] font-medium text-[var(--admin-text)] truncate">
                  {item[titleField] || `Untitled ${labelSingular}`}
                </h3>
                <p className="text-[12px] text-[var(--admin-muted)] truncate">
                  {[
                    subtitleField && item[subtitleField],
                    item.email ? item.email : null,
                    typeof item.priceINR === 'number' && item.priceINR > 0 ? `₹${item.priceINR}` : null,
                    typeof item.feeINR === 'number' && item.feeINR > 0 ? `₹${item.feeINR}` : null,
                    typeof item.hourlyRate === 'number' && item.hourlyRate > 0 ? `₹${item.hourlyRate}/session` : null,
                    item.status,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-md ${
                item.visible === false ? 'admin-tone-warn' : 'admin-tone-ok'
              }`}>
                {item.visible === false ? 'Hidden' : 'Visible'}
              </span>
              {renderItemExtra && (
                <div className="shrink-0 flex items-center">
                  {renderItemExtra(item, fetchItems)}
                </div>
              )}
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="w-8 h-8 rounded-lg text-[var(--admin-muted)] hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)] disabled:opacity-30 cursor-pointer flex items-center justify-center"
                  title="Move up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === items.length - 1}
                  className="w-8 h-8 rounded-lg text-[var(--admin-muted)] hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)] disabled:opacity-30 cursor-pointer flex items-center justify-center"
                  title="Move down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleVisible(item)}
                  className="w-8 h-8 rounded-lg text-[var(--admin-muted)] hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)] cursor-pointer flex items-center justify-center"
                  title={item.visible === false ? 'Show' : 'Hide'}
                >
                  {item.visible === false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => openEditForm(item)}
                  className="w-8 h-8 rounded-lg text-[var(--admin-muted)] hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)] cursor-pointer flex items-center justify-center"
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  className="w-8 h-8 rounded-lg text-[var(--admin-muted)] hover:bg-[var(--admin-hover)] hover:text-red-600 cursor-pointer flex items-center justify-center"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecordListEditor;
