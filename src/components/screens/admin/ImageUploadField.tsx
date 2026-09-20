import React, { useRef, useState } from 'react';
import { ImagePlus, Trash2, Loader2, ImageOff } from 'lucide-react';
import { adminFetch } from '../../../utils/adminAuth';

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
}

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 8 * 1024 * 1024;

// Admin image control: shows the current image, lets the admin upload a
// replacement (stored in MongoDB via /api/media), remove it, or — as an
// advanced option — point at an existing URL/path. The saved value is just
// the URL/path string, so nothing else in the app changes.
export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  value,
  onChange,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [broken, setBroken] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');

    if (!ACCEPTED.includes(file.type)) {
      setError('Please choose a JPG, PNG or WebP image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('That image is larger than 8 MB.');
      return;
    }

    setBusy(true);
    try {
      const res = await adminFetch('/api/media', {
        method: 'POST',
        headers: {
          'Content-Type': file.type,
          'X-File-Name': encodeURIComponent(file.name),
        },
        body: file,
      });
      const data = await res.json();

      if (data.success && data.url) {
        setBroken(false);
        onChange(data.url);
      } else {
        setError(data.error || 'Upload failed. Please try again.');
      }
    } catch {
      setError('Upload failed. Please check your connection and try again.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="sm:col-span-2">
      <label className="block text-xs font-bold text-[#061b3b] mb-1">{label}</label>

      <div className="flex flex-col sm:flex-row gap-4 p-3 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl">
        <div className="w-28 h-28 shrink-0 rounded-xl bg-white border border-[#cbdaff] overflow-hidden flex items-center justify-center">
          {value && !broken ? (
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-contain"
              onError={() => setBroken(true)}
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-[#666a76] text-[11px] font-semibold">
              <ImageOff className="w-5 h-5" />
              <span>{value ? 'Cannot load' : 'No image'}</span>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
              <span>{busy ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}</span>
            </button>

            {value && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setBroken(false);
                  onChange('');
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            )}

            <input aria-label="Upload image"
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>

          <p className="text-[11px] text-[#666a76]">
            JPG, PNG or WebP, up to 8 MB. The new image appears on the website after you click Save.
          </p>

          {error && <p className="text-[11px] font-bold text-red-600">{error}</p>}

          <input aria-label="Image URL or path"
            type="text"
            value={value}
            onChange={(e) => {
              setBroken(false);
              onChange(e.target.value);
            }}
            placeholder="…or paste an image URL / path"
            className="w-full px-3 py-1.5 bg-white border border-[#cbdaff] rounded-lg text-[11px] text-[#434652] focus:outline-none focus:border-[#002869]"
          />
        </div>
      </div>
    </div>
  );
};

export default ImageUploadField;
