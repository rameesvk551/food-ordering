import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface GallerySliderProps {
  images: string[];
  alt: string;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  onImageChange?: (index: number) => void;
}

const GallerySlider = ({
  images,
  alt,
  autoPlay = true,
  autoPlayInterval = 4000,
  onImageChange,
}: GallerySliderProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(autoPlay);
  const [isTouching, setIsTouching] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const autoPlayTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const imageCount = images.length || 1;

  const goToSlide = useCallback(
    (index: number) => {
      const newIndex = (index + imageCount) % imageCount;
      setCurrentIndex(newIndex);
      onImageChange?.(newIndex);
      // Reset autoplay timer when manually changing
      if (autoPlay) {
        setIsAutoPlaying(true);
      }
    },
    [imageCount, autoPlay, onImageChange]
  );

  const nextSlide = useCallback(() => {
    goToSlide(currentIndex + 1);
  }, [currentIndex, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide(currentIndex - 1);
  }, [currentIndex, goToSlide]);

  // Autoplay effect
  useEffect(() => {
    if (!autoPlay || !isAutoPlaying || imageCount <= 1) return;

    autoPlayTimer.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % imageCount);
    }, autoPlayInterval);

    return () => {
      if (autoPlayTimer.current) {
        clearInterval(autoPlayTimer.current);
      }
    };
  }, [autoPlay, isAutoPlaying, imageCount, autoPlayInterval]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsTouching(true);
    setIsAutoPlaying(false);
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isTouching) return;

    const touchEndX = e.touches[0].clientX;
    const touchEndY = e.touches[0].clientY;
    const diffX = touchStartX.current - touchEndX;
    const diffY = touchStartY.current - touchEndY;

    // Only swipe horizontally, ignore vertical scrolls
    if (Math.abs(diffY) > Math.abs(diffX)) return;

    // Minimum swipe distance (50px)
    if (Math.abs(diffX) > 50) {
      if (diffX > 0) {
        // Swiped left - next slide
        nextSlide();
      } else {
        // Swiped right - previous slide
        prevSlide();
      }
      setIsTouching(false);
    }
  };

  const handleTouchEnd = () => {
    setIsTouching(false);
    if (autoPlay) {
      // Resume autoplay after 1 second of inactivity
      setTimeout(() => {
        setIsAutoPlaying(true);
      }, 1000);
    }
  };

  // Handle mouse over for pause (optional, but nice UX)
  const handleMouseEnter = () => {
    if (autoPlay) {
      setIsAutoPlaying(false);
    }
  };

  const handleMouseLeave = () => {
    if (autoPlay) {
      setIsAutoPlaying(true);
    }
  };

  // Show only if we have images
  if (!images || images.length === 0) {
    return (
      <div className="h-full w-full bg-gradient-to-b from-[#5d7e67] to-[#385442]" />
    );
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-black"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Image Container */}
      <div className="relative h-full w-full">
        {images.map((image, index) => (
          <div
            key={`gallery-slide-${index}`}
            className={`absolute inset-0 transition-opacity duration-500 ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={image}
              alt={`${alt} - ${index + 1}`}
              className="h-full w-full object-cover"
              loading={index === currentIndex ? 'eager' : 'lazy'}
            />
          </div>
        ))}
      </div>

      {/* Show navigation controls only if more than 1 image */}
      {images.length > 1 && (
        <>
          {/* Left Arrow */}
          <button
            type="button"
            onClick={prevSlide}
            className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white transition-all hover:bg-black/60 active:scale-95"
            aria-label="Previous image"
          >
            <ChevronLeft size={24} />
          </button>

          {/* Right Arrow */}
          <button
            type="button"
            onClick={nextSlide}
            className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white transition-all hover:bg-black/60 active:scale-95"
            aria-label="Next image"
          >
            <ChevronRight size={24} />
          </button>

          {/* Dot Indicators */}
          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
            {images.map((_, index) => (
              <button
                key={`dot-${index}`}
                type="button"
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'w-8 bg-white'
                    : 'w-2 bg-white/50 hover:bg-white/70'
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>

          {/* Image Counter */}
          <div className="absolute top-4 right-4 z-20 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
            {currentIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
};

export default GallerySlider;
