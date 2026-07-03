import { useEffect, useState, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Download } from 'lucide-react';

export default function ProofGalleryModal({ visible, images = [], startIndex = 0, onClose }) {
  const [current, setCurrent] = useState(startIndex || 0);
  const dialogRef = useRef(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrent(startIndex || 0);
  }, [startIndex, visible]);

  const prev = useCallback(() => setCurrent(i => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setCurrent(i => (i + 1) % images.length), [images.length]);

  const downloadCurrentImage = useCallback(async () => {
    try {
      const url = images[current];
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
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center border border-slate-100 shadow-xl">
          <p className="font-extrabold text-slate-800 text-lg">No Images</p>
          <p className="text-slate-400 text-sm mt-1">There are no files attached to this record.</p>
          <div className="mt-6">
            <button onClick={onClose} className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors shadow-md shadow-blue-500/10">Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 z-50 animate-fade-in">
      <div 
        ref={dialogRef} 
        className="glass-panel-dark bg-slate-900/90 border border-slate-800 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl animate-scale-up"
      >
        {/* Header */}
        <div className="p-4 flex justify-between items-center border-b border-slate-800 bg-slate-950/30">
          <div className="flex items-center gap-3">
            <h3 className="font-extrabold text-white text-md tracking-tight">Documentary Proof</h3>
            <span className="text-[10px] bg-slate-800 text-slate-300 font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
              {current + 1} of {images.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={downloadCurrentImage} 
              className="p-2 cursor-pointer rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" 
              title="Download current image"
            >
              <Download className="w-4.5 h-4.5" />
            </button>
            <button 
              onClick={onClose} 
              className="p-2 cursor-pointer rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" 
              title="Close modal"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Image viewport */}
        <div className="p-6 sm:p-10 flex items-center justify-center relative bg-slate-950/20" style={{ minHeight: 380 }}>
          
          <button 
            onClick={prev} 
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 cursor-pointer rounded-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition shadow-lg active:scale-95 z-10"
            title="Previous Image"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <img 
            src={images[current]} 
            alt={`Proof ${current+1}`} 
            className="max-h-[60vh] object-contain rounded-2xl shadow-xl border border-slate-800 animate-fade-in" 
          />

          <button 
            onClick={next} 
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 cursor-pointer rounded-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition shadow-lg active:scale-95 z-10"
            title="Next Image"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Thumbnail Dots */}
        {images.length > 1 && (
          <div className="p-4 border-t border-slate-800/60 flex items-center justify-center gap-2 bg-slate-950/10">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className={`w-2 h-2 rounded-full cursor-pointer transition-all duration-300 ${idx === current ? 'bg-blue-500 w-4' : 'bg-slate-700 hover:bg-slate-600'}`}
                aria-label={`Go to image ${idx+1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
