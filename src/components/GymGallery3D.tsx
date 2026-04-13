import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface GymGallery3DProps {
  images: { src: string; alt: string }[];
  title?: string;
  subtitle?: string;
}

const GymGallery3D: React.FC<GymGallery3DProps> = ({ 
  images, 
  title = "Περιηγηθείτε στο χώρο μας",
  subtitle = "Ανακαλύψτε τους σύγχρονους χώρους του γυμναστηρίου μας"
}) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true,
    align: 'center',
    skipSnaps: false,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Auto-play
  useEffect(() => {
    if (!emblaApi) return;
    const autoplay = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);
    return () => clearInterval(autoplay);
  }, [emblaApi]);

  const getSlideStyle = (index: number) => {
    const diff = index - selectedIndex;
    const normalizedDiff = ((diff + images.length) % images.length);
    const actualDiff = normalizedDiff > images.length / 2 ? normalizedDiff - images.length : normalizedDiff;
    
    const absOffset = Math.abs(actualDiff);
    const scale = absOffset === 0 ? 1 : Math.max(0.7, 1 - absOffset * 0.15);
    const opacity = absOffset === 0 ? 1 : Math.max(0.4, 1 - absOffset * 0.3);
    const zIndex = 10 - absOffset;
    const rotateY = actualDiff * -15;
    const translateX = actualDiff * 10;

    return {
      transform: `perspective(1000px) rotateY(${rotateY}deg) scale(${scale}) translateX(${translateX}%)`,
      opacity,
      zIndex,
      transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    };
  };

  if (images.length === 0) return null;

  return (
    <section className="py-16 bg-gradient-to-b from-background to-muted/30 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        <div className="relative max-w-6xl mx-auto">
          {/* Navigation Buttons */}
          <Button
            variant="outline"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-background/80 backdrop-blur-sm hover:bg-background shadow-lg"
            onClick={scrollPrev}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-background/80 backdrop-blur-sm hover:bg-background shadow-lg"
            onClick={scrollNext}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>

          {/* Carousel */}
          <div ref={emblaRef} className="overflow-hidden py-8">
            <div className="flex">
              {images.map((image, index) => (
                <div
                  key={index}
                  className="flex-[0_0_80%] md:flex-[0_0_60%] min-w-0 px-4"
                  style={getSlideStyle(index)}
                >
                  <div 
                    className="relative group cursor-pointer rounded-2xl overflow-hidden shadow-2xl"
                    onClick={() => setFullscreenImage(image.src)}
                  >
                    <div className="aspect-[16/10]">
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                        <span className="text-white font-medium">{image.alt}</span>
                        <Maximize2 className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    {/* Reflection effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => emblaApi?.scrollTo(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  index === selectedIndex 
                    ? 'bg-primary w-8' 
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={!!fullscreenImage} onOpenChange={() => setFullscreenImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
          {fullscreenImage && (
            <img
              src={fullscreenImage}
              alt="Fullscreen view"
              className="w-full h-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default GymGallery3D;
