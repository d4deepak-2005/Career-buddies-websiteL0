import React, { useState } from 'react';

interface FittedPortraitImageProps {
  src: string;
  alt: string;
  // Extra classes for the sharp photograph (e.g. hover zoom).
  imgClassName?: string;
  onError?: () => void;
}

// Fills its (relative, overflow-hidden, fixed-ratio) parent frame.
//  - Photos already shaped like the frame (Deepak, Divyanshu: 4:3) fill it edge to edge.
//  - Photos with a different shape (Nishant: 3:2) are shown COMPLETE and uncropped, at full
//    frame width and centred; the space above/below is filled with a soft blurred copy of the
//    same photo, and the photo's top/bottom few pixels melt into it, so there are no hard bars.
// The image file is never modified or stretched.
export const FittedPortraitImage: React.FC<FittedPortraitImageProps> = ({
  src,
  alt,
  imgClassName = '',
  onError
}) => {
  // 'fill' = photo matches the frame; 'wide' = wider than the frame; 'tall' = taller than the frame.
  const [mode, setMode] = useState<'fill' | 'wide' | 'tall'>('fill');
  const fitWhole = mode !== 'fill';

  const fade = 'linear-gradient(to bottom, transparent 0, #000 8px, #000 calc(100% - 8px), transparent 100%)';

  return (
    <>
      {fitWhole && (
        <img
          src={src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ filter: 'blur(26px) saturate(1.05)', transform: 'scale(1.3)' }}
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      )}
      <img
        src={src}
        alt={alt}
        className={
          mode === 'wide'
            ? `absolute left-0 top-1/2 -translate-y-1/2 w-full h-auto ${imgClassName}`
            : `absolute inset-0 w-full h-full ${imgClassName}`
        }
        style={
          mode === 'wide'
            ? { display: 'block', WebkitMaskImage: fade, maskImage: fade }
            : mode === 'tall'
              ? { objectFit: 'contain', objectPosition: 'center center', display: 'block' }
              : { objectFit: 'cover', objectPosition: '50% 30%', display: 'block' }
        }
        loading="eager"
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={(e) => {
          const img = e.currentTarget;
          // Frame shape is measured while the image still fills the frame (first load).
          const frame = (img.parentElement?.clientWidth || 0) / (img.parentElement?.clientHeight || 1);
          const natural = img.naturalWidth / img.naturalHeight;
          if (frame && natural && isFinite(frame) && isFinite(natural)) {
            const ratio = natural / frame;
            setMode(ratio > 1.03 ? 'wide' : ratio < 0.97 ? 'tall' : 'fill');
          }
        }}
        onError={onError}
      />
    </>
  );
};

export default FittedPortraitImage;
