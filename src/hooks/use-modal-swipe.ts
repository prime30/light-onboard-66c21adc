import { useState, useRef, useCallback, RefObject } from "react";

interface UseModalSwipeOptions {
  /** Threshold in pixels before the modal closes */
  closeThreshold?: number;
  /** Top area in pixels where drag is allowed */
  dragZoneHeight?: number;
  /** Minimum screen width for mobile (swipe disabled above this) */
  mobileBreakpoint?: number;
  /** Callback when modal should close */
  onClose: () => void;
}

interface UseModalSwipeReturn {
  /** Ref to attach to the modal element */
  modalRef: RefObject<HTMLDivElement>;
  /** Current drag offset in pixels */
  modalDragOffset: number;
  /** Whether the modal is in closing animation */
  isClosing: boolean;
  /** Whether the modal is bouncing back after incomplete swipe */
  isBouncingBack: boolean;
  /** Set closing state (for external close triggers) */
  setIsClosing: (closing: boolean) => void;
  /** Touch start handler for the modal */
  handleModalTouchStart: (e: React.TouchEvent) => void;
  /** Touch move handler for the modal */
  handleModalTouchMove: (e: React.TouchEvent) => void;
  /** Touch end handler for the modal */
  handleModalTouchEnd: () => void;
  /** Touch start handler for the backdrop */
  handleBackdropTouchStart: (e: React.TouchEvent) => void;
  /** Get backdrop opacity based on drag offset (0.2 to 0.6) */
  getBackdropOpacity: () => number;
  /** Get modal transform style based on drag offset */
  getModalTransform: () => string | undefined;
  /** Get modal opacity based on drag offset */
  getModalOpacity: () => number | undefined;
  /** Get modal transition style */
  getModalTransition: () => string | undefined;
}

export function useModalSwipe({
  closeThreshold = 100,
  dragZoneHeight = 50,
  mobileBreakpoint = 640,
  onClose,
}: UseModalSwipeOptions): UseModalSwipeReturn {
  const modalRef = useRef<HTMLDivElement>(null);
  const modalTouchStartY = useRef<number | null>(null);
  const isDragFromTop = useRef<boolean>(false);
  
  const [modalDragOffset, setModalDragOffset] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const [isBouncingBack, setIsBouncingBack] = useState(false);

  const handleModalTouchStart = useCallback((e: React.TouchEvent) => {
    // Only enable swipe-down on mobile
    if (window.innerWidth >= mobileBreakpoint) return;
    
    const modalElement = modalRef.current;
    if (!modalElement) return;
    
    const modalRect = modalElement.getBoundingClientRect();
    const touchY = e.touches[0].clientY;
    const relativeY = touchY - modalRect.top;
    
    // Allow drag if started within the drag zone
    if (relativeY <= dragZoneHeight) {
      isDragFromTop.current = true;
      modalTouchStartY.current = touchY;
    } else {
      isDragFromTop.current = false;
      modalTouchStartY.current = null;
    }
  }, [mobileBreakpoint, dragZoneHeight]);

  const handleModalTouchMove = useCallback((e: React.TouchEvent) => {
    if (window.innerWidth >= mobileBreakpoint || !isDragFromTop.current || modalTouchStartY.current === null) return;
    
    const currentY = e.touches[0].clientY;
    const rawDiff = currentY - modalTouchStartY.current;
    
    // Only allow dragging down, not up
    if (rawDiff > 0) {
      // Add resistance: drag slows down progressively
      const threshold = closeThreshold;
      let resistedDiff;
      if (rawDiff <= threshold) {
        resistedDiff = rawDiff;
      } else {
        // Apply logarithmic resistance past threshold
        const overflow = rawDiff - threshold;
        resistedDiff = threshold + (overflow * 0.3);
      }
      setModalDragOffset(resistedDiff);
    }
  }, [mobileBreakpoint, closeThreshold]);

  const handleModalTouchEnd = useCallback(() => {
    if (!isDragFromTop.current || modalTouchStartY.current === null) return;
    
    // If dragged more than threshold, close the modal
    if (modalDragOffset > closeThreshold) {
      onClose();
    } else if (modalDragOffset > 0) {
      // Snap back with bounce
      setIsBouncingBack(true);
      setModalDragOffset(0);
      setTimeout(() => {
        setIsBouncingBack(false);
      }, 500);
    }
    
    modalTouchStartY.current = null;
    isDragFromTop.current = false;
  }, [modalDragOffset, closeThreshold, onClose]);

  const handleBackdropTouchStart = useCallback((e: React.TouchEvent) => {
    // Only enable swipe-down on mobile
    if (window.innerWidth >= mobileBreakpoint) return;
    
    const modalElement = modalRef.current;
    if (!modalElement) return;
    
    const modalRect = modalElement.getBoundingClientRect();
    const touchY = e.touches[0].clientY;
    
    // If touch is above the modal, allow drag
    if (touchY < modalRect.top) {
      isDragFromTop.current = true;
      modalTouchStartY.current = touchY;
    }
  }, [mobileBreakpoint]);

  const getBackdropOpacity = useCallback((): number => {
    return Math.max(0.6 - modalDragOffset * 0.003, 0.2);
  }, [modalDragOffset]);

  const getModalTransform = useCallback((): string | undefined => {
    if (modalDragOffset > 0) {
      return `translateY(${modalDragOffset}px) scale(${1 - Math.min(modalDragOffset * 0.0003, 0.03)})`;
    }
    return undefined;
  }, [modalDragOffset]);

  const getModalOpacity = useCallback((): number | undefined => {
    if (modalDragOffset > 0) {
      return Math.max(1 - modalDragOffset * 0.002, 0.85);
    }
    return undefined;
  }, [modalDragOffset]);

  const getModalTransition = useCallback((): string | undefined => {
    if (modalDragOffset > 0) {
      return 'none';
    }
    if (isBouncingBack) {
      return 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-out';
    }
    return undefined;
  }, [modalDragOffset, isBouncingBack]);

  return {
    modalRef,
    modalDragOffset,
    isClosing,
    isBouncingBack,
    setIsClosing,
    handleModalTouchStart,
    handleModalTouchMove,
    handleModalTouchEnd,
    handleBackdropTouchStart,
    getBackdropOpacity,
    getModalTransform,
    getModalOpacity,
    getModalTransition,
  };
}
