/**
 * Resizable divider component for adjusting panel widths.
 */
import { useState, useCallback, useEffect } from 'react';
import { GripVertical } from 'lucide-react';

interface ResizableDividerProps {
  onResize: (delta: number) => void;
  onResizeEnd?: () => void;
}

export default function ResizableDivider({ onResize, onResizeEnd }: ResizableDividerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setStartX(e.clientX);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const delta = e.clientX - startX;
    setStartX(e.clientX);
    onResize(delta);
  }, [isDragging, startX, onResize]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onResizeEnd?.();
    }
  }, [isDragging, onResizeEnd]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Add cursor style to body while dragging
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`
        w-2 flex-shrink-0 cursor-col-resize
        flex items-center justify-center
        transition-colors duration-150
        ${isDragging 
          ? 'bg-blue-500/30' 
          : 'bg-slate-800 hover:bg-slate-700'
        }
      `}
    >
      <div className={`
        flex flex-col gap-0.5 py-2 rounded
        ${isDragging ? 'opacity-100' : 'opacity-40 hover:opacity-100'}
        transition-opacity duration-150
      `}>
        <GripVertical className="w-3 h-3 text-slate-400" />
      </div>
    </div>
  );
}

