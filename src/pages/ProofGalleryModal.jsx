import { useEffect, useState, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Download } from 'lucide-react';

export default function ProofGalleryModal({ visible, images = [], startIndex = 0, onClose }) {
  const [current, setCurrent] = useState(startIndex || 0);
  const dialogRef = useRef(null);

  useEffect(() => {
    setCurrent(startIndex || 0);
  }, [startIndex, visible]);

  const prev = useCallback(() => setCurrent(i => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setCurrent(i => (i + 1) % images.length), [images.length]);

  const downloadCurrentImage = useCallback(async () => {
    try {
      const url = images[current];
      // fetch and create blob to ensure cross-origin images download correctly
      const res = await fetch(url, { mode: 'cors' });
      const blob = await res.blob();
      const a = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      const filename = (url.split('/').pop() || `proof-${current+1}`).split('?')[0];
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('Download failed', err);
      alert('Failed to download image');
    }
  }, [images, current]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [visible, onClose, prev, next]);

  if (!visible) return null;

  if (!images || images.length === 0) {
    return (
      <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
          <p className="font-bold">No images to display</p>
          <div className="mt-4">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-blue-600 text-white">Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center p-4 z-50">
      <div ref={dialogRef} className="bg-white rounded-2xl max-w-4xl w-full overflow-hidden">
        <div className="p-4 flex justify-between items-center border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h3 className="font-black">Proof Images</h3>
            <span className="text-sm text-gray-400">{current + 1} of {images.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={downloadCurrentImage} className="p-2 rounded-md hover:bg-gray-50" title="Download current image"><Download className="w-4 h-4" /></button>
            <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-50"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="p-6 flex items-center justify-center relative bg-gray-50" style={{ minHeight: 360 }}>
          <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white shadow-md hover:bg-gray-50">
            <ChevronLeft className="w-5 h-5" />
          </button>

          <img src={images[current]} alt={`Proof ${current+1}`} className="max-h-[60vh] object-contain" />

          <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white shadow-md hover:bg-gray-50">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-t border-gray-100 flex items-center justify-center gap-2">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`w-2 h-2 rounded-full ${idx === current ? 'bg-blue-600' : 'bg-gray-300'}`}
              aria-label={`Go to image ${idx+1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
