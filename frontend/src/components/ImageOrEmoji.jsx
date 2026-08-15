// يحدد هل القيمة رابط صورة مرفوعة ولا إيموجي/نص عادي، ويعرضها بالشكل المناسب
function isImageUrl(value) {
  if (!value || typeof value !== 'string') return false;
  return value.startsWith('/uploads/') || value.startsWith('http://') || value.startsWith('https://');
}

export default function ImageOrEmoji({ src, alt = '', className = '', emojiClass = '', fallback = '🏪' }) {
  if (isImageUrl(src)) {
    return <img src={src} alt={alt} className={className} loading="lazy" />;
  }
  return <span className={emojiClass}>{src || fallback}</span>;
}

export { isImageUrl };
