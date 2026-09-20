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

export interface FieldConfig {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'tags' | 'number' | 'select' | 'checkbox' | 'json' | 'image';
  options?: string[];
  placeholder?: string;
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
}

const inputClass =
  'w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs text-[#061b3b] focus:outline-none focus:border-[#002869]';
const labelClass = 'block text-xs font-bold text-[#061b3b] mb-1';

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
}) => {
  const [items, setItems] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [jsonDrafts, setJsonDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);

  const jsonFieldKeys = fields.filter((f) => f.type === 'json').map((f) => f.key);

  const seedJsonDrafts = (record: Record<string, any>) => {
    const drafts: Record<string, string> = {};
    jsonFieldKeys.forEach((key) => {
      drafts[key] = JSON.stringify(record[key] ?? [], null, 2);
    });
    setJsonDrafts(drafts);
  };

  const matchesFilter = (item: Record<string, any>) =>
    !filter || Object.entries(filter).every(([k, v]) => item[k] === v);

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
    const record = { ...emptyRecord, ...filter };
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
        <div className="flex items-center gap-3">
          {savedFlash && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#79fd8d]/30 text-[#00531d] text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Saved!</span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={openAddForm}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add New {labelSingular}
        </button>
      </div>

      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-2xl bg-white border border-[#cbdaff] shadow-sm flex flex-col gap-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-[#061b3b]">
              {editingId ? `Edit ${labelSingular}` : `New ${labelSingular}`}
            </h4>
            <button
              type="button"
              onClick={closeForm}
              className="p-1.5 text-[#747783] hover:text-[#061b3b] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((field) => {
              if (field.type === 'textarea') {
                return (
                  <div key={field.key} className="sm:col-span-2">
                    <label className={labelClass}>{field.label}</label>
                    <textarea
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
                    <label className={labelClass}>{field.label} (comma-separated)</label>
                    <input
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
                    <label className="flex items-center gap-2 text-xs font-bold text-[#061b3b] cursor-pointer">
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
                    <label className={labelClass}>{field.label} (JSON)</label>
                    <textarea
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
              if (field.type === 'select') {
                return (
                  <div key={field.key}>
                    <label className={labelClass}>{field.label}</label>
                    <select
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
                  <label className={labelClass}>{field.label}</label>
                  <input
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
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-700 text-xs font-bold">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={closeForm}
              className="px-4 py-2 text-xs font-semibold text-[#434652] hover:text-[#061b3b] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-[#006e29] hover:bg-[#00531d] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save & Publish
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-xs text-[#747783]">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-[#747783] p-4">
          No {labelSingular.toLowerCase()} records yet. Click "Add New {labelSingular}" to create one.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item, index) => (
            <div
              key={item._id}
              className={`p-4 rounded-2xl border ${
                item.visible === false
                  ? 'bg-gray-50 border-gray-200 opacity-70'
                  : 'bg-white border-[#cbdaff]'
              } flex flex-col gap-2`}
            >
              <div className="flex items-start justify-between gap-2">
                {imageField && (
                  <div className="w-12 h-12 shrink-0 rounded-lg bg-[#f1f3ff] border border-[#cbdaff] overflow-hidden">
                    {item[imageField] && (
                      <img src={item[imageField]} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h5 className="font-bold text-sm text-[#061b3b] truncate">
                    {item[titleField]}
                  </h5>
                  {subtitleField && item[subtitleField] && (
                    <p className="text-xs text-[#747783] truncate">{item[subtitleField]}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.visible === false
                      ? 'bg-gray-200 text-gray-600'
                      : 'bg-[#79fd8d]/30 text-[#00531d]'
                  }`}
                >
                  {item.visible === false ? 'Hidden' : 'Visible'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="p-1.5 text-[#747783] hover:text-[#061b3b] disabled:opacity-30 cursor-pointer"
                    title="Move up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1}
                    className="p-1.5 text-[#747783] hover:text-[#061b3b] disabled:opacity-30 cursor-pointer"
                    title="Move down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleVisible(item)}
                    className="p-1.5 text-[#747783] hover:text-[#002869] cursor-pointer"
                    title={item.visible === false ? 'Show' : 'Hide'}
                  >
                    {item.visible === false ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditForm(item)}
                    className="p-1.5 text-[#747783] hover:text-[#002869] cursor-pointer"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="p-1.5 text-red-500 hover:text-red-700 cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecordListEditor;
