import { useRef, useState } from 'react';
import { api } from '../api';
import ImageOrEmoji from './ImageOrEmoji';

export default function ImageUpload({ value, onChange, size = 'md' }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null); // معاينة محلية فورية لحد ما الرفع يخلص

  const sizeClass = size === 'lg' ? 'w-24 h-24' : 'w-16 h-16';

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');

    // نعرض الصورة فورًا من على جهاز المستخدم نفسه، من غير ما ننتظر رفعها للسيرفر
    const localPreviewUrl = URL.createObjectURL(file);
    setPreview(localPreviewUrl);
    setUploading(true);

    try {
      const { url } = await api.uploadImage(file);
      onChange(url);
    } catch (err) {
      setError(err.message || 'الصورة متترفعتش، حاول تاني');
      setPreview(null); // نرجع نمسح المعاينة المحلية لو الرفع فشل فعليًا
    } finally {
      setUploading(false);
      URL.revokeObjectURL(localPreviewUrl);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const displaySrc = preview || value;

  return (
    <div className="flex items-center gap-3">
      <div className={`${sizeClass} rounded-xl bg-primary-50 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 relative`}>
        {preview ? (
          <img src={preview} alt="معاينة" className="w-full h-full object-cover" />
        ) : (
          <ImageOrEmoji src={displaySrc} alt="معاينة" className="w-full h-full object-cover" emojiClass="text-3xl" />
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      <div className="flex-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleFile}
          className="hidden"
          id={`img-upload-${Math.random().toString(36).slice(2)}`}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-sm font-semibold bg-gray-100 hover:bg-gray-200 disabled:opacity-50 px-3 py-1.5 rounded-full"
        >
          {uploading ? 'جاري الرفع...' : 'ارفع صورة'}
        </button>
        <p className="text-[11px] text-gray-400 mt-1">أو سيب الحقل واستخدم إيموجي كرمز مؤقت</p>
        {error && <p className="text-red-500 text-xs font-semibold mt-1">⚠️ {error}</p>}
      </div>
    </div>
  );
}
