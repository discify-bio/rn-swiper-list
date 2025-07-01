import React, { useImperativeHandle, type ForwardedRef, useState, useMemo } from 'react';
import { runOnJS, useAnimatedReaction } from 'react-native-reanimated';
import { Dimensions } from 'react-native';
import type { SwiperCardRefType, SwiperOptions } from 'discify-bio-rn-swiper-list';

import useSwipeControls from './hooks/useSwipeControls';
import SwiperCard from './SwiperCard';
import type { SpringConfig } from 'react-native-reanimated/lib/typescript/reanimated2/animation/springUtils';

const { width: windowWidth, height: windowHeight } = Dimensions.get('screen');

const SWIPE_SPRING_CONFIG: SpringConfig = {
  damping: 20,
  stiffness: 50,
  mass: 1,
  overshootClamping: true,
  restDisplacementThreshold: 0.0001,
  restSpeedThreshold: 0.0001,
};

const Swiper = <T,>(
  {
    data,
    renderCard,
    onSwipeRight,
    onSwipeLeft,
    onSwipedAll,
    onSwipeTop,
    onSwipeBottom,
    onIndexChange,
    cardStyle,
    disableRightSwipe,
    disableLeftSwipe,
    disableTopSwipe,
    disableBottomSwipe,
    translateXRange = [-windowWidth / 3, 0, windowWidth / 3],
    translateYRange = [-windowHeight / 3, 0, windowHeight / 3],
    rotateInputRange = [-windowWidth / 3, 0, windowWidth / 3],
    rotateOutputRange = [-Math.PI / 20, 0, Math.PI / 20],
    inputOverlayLabelRightOpacityRange = [0, windowWidth / 3],
    outputOverlayLabelRightOpacityRange = [0, 1],
    inputOverlayLabelLeftOpacityRange = [0, -(windowWidth / 3)],
    outputOverlayLabelLeftOpacityRange = [0, 1],
    inputOverlayLabelTopOpacityRange = [0, -(windowHeight / 3)],
    outputOverlayLabelTopOpacityRange = [0, 1],
    inputOverlayLabelBottomOpacityRange = [0, windowHeight / 3],
    outputOverlayLabelBottomOpacityRange = [0, 1],
    OverlayLabelRight,
    OverlayLabelLeft,
    OverlayLabelTop,
    OverlayLabelBottom,
    onSwipeStart,
    onSwipeActive,
    onSwipeEnd,
    swipeBackXSpringConfig = SWIPE_SPRING_CONFIG,
    swipeBackYSpringConfig = SWIPE_SPRING_CONFIG,
    swipeRightSpringConfig = SWIPE_SPRING_CONFIG,
    swipeLeftSpringConfig = SWIPE_SPRING_CONFIG,
    swipeTopSpringConfig = SWIPE_SPRING_CONFIG,
    swipeBottomSpringConfig = SWIPE_SPRING_CONFIG,
    loop = false,
    keyExtractor,
    useChunks = false,
    chunkSize = 20,
    preloadChunks = 1,
    onChunkChange,
  }: SwiperOptions<T>,
  ref: ForwardedRef<SwiperCardRefType>
) => {
  const [currentChunk, setCurrentChunk] = useState(0);
  
  // Calculate how many chunks we have
  const totalChunks = useMemo(() => {
    if (!useChunks) return 1;
    return Math.ceil(data.length / chunkSize);
  }, [useChunks, data.length, chunkSize]);
  
  // Get chunked data
  const visibleData = useMemo(() => {
    if (!useChunks) return data;
    
    const chunks = [];
    const startChunk = Math.max(0, currentChunk - preloadChunks);
    const endChunk = Math.min(totalChunks - 1, currentChunk + preloadChunks);
    
    for (let i = startChunk; i <= endChunk; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, data.length);
      chunks.push(...data.slice(start, end));
    }
    
    return chunks;
  }, [useChunks, data, chunkSize, currentChunk, preloadChunks, totalChunks]);
  
  // Calculate real indices from chunked indices
  const getOriginalIndex = (chunkIndex: number) => {
    if (!useChunks) return chunkIndex;
    
    const startChunk = Math.max(0, currentChunk - preloadChunks);
    return (startChunk * chunkSize) + chunkIndex;
  };

  const {
    activeIndex,
    refs,
    swipeRight,
    swipeLeft,
    swipeBack,
    swipeTop,
    swipeBottom,
  } = useSwipeControls(visibleData, loop);

  useImperativeHandle(
    ref,
    () => {
      return {
        swipeLeft,
        swipeRight,
        swipeBack,
        swipeTop,
        swipeBottom,
      };
    },
    [swipeLeft, swipeRight, swipeBack, swipeTop, swipeBottom]
  );

  // Watch activeIndex and update chunk when needed
  useAnimatedReaction(
    () => activeIndex.value,
    (currentIndex, prevIndex) => {
      if (!useChunks || currentIndex === prevIndex) return;
      
      const originalIndex = getOriginalIndex(currentIndex);
      const newChunk = Math.floor(originalIndex / chunkSize);
      
      if (newChunk !== currentChunk) {
        runOnJS(setCurrentChunk)(newChunk);
        if (onChunkChange) {
          runOnJS(onChunkChange)(newChunk);
        }
      }
    },
    [useChunks, chunkSize, currentChunk, onChunkChange]
  );

  useAnimatedReaction(
    () => {
      if (useChunks) {
        const originalIndex = getOriginalIndex(activeIndex.value);
        return originalIndex >= data.length;
      }
      return activeIndex.value >= data.length;
    },
    (isSwipingFinished: boolean) => {
      if (isSwipingFinished && onSwipedAll) {
        runOnJS(onSwipedAll)();
      }
    },
    [data, useChunks, currentChunk]
  );

  //Listen to the activeIndex value
  useAnimatedReaction(
    () => {
      return activeIndex.value;
    },
    (currentValue, previousValue) => {
      if (currentValue !== previousValue && onIndexChange) {
        if (useChunks) {
          const originalIndex = getOriginalIndex(currentValue);
          runOnJS(onIndexChange)(originalIndex);
        } else {
          runOnJS(onIndexChange)(currentValue);
        }
      }
    },
    []
  );

  // Handle callbacks with original index calculations
  const handleSwipeRight = (index: number) => {
    if (useChunks) {
      const originalIndex = getOriginalIndex(index);
      onSwipeRight?.(originalIndex);
    } else {
      onSwipeRight?.(index);
    }
  };

  const handleSwipeLeft = (index: number) => {
    if (useChunks) {
      const originalIndex = getOriginalIndex(index);
      onSwipeLeft?.(originalIndex);
    } else {
      onSwipeLeft?.(index);
    }
  };

  const handleSwipeTop = (index: number) => {
    if (useChunks) {
      const originalIndex = getOriginalIndex(index);
      onSwipeTop?.(originalIndex);
    } else {
      onSwipeTop?.(index);
    }
  };

  const handleSwipeBottom = (index: number) => {
    if (useChunks) {
      const originalIndex = getOriginalIndex(index);
      onSwipeBottom?.(originalIndex);
    } else {
      onSwipeBottom?.(index);
    }
  };

  return visibleData
    .map((item, index) => {
      const originalIndex = useChunks ? getOriginalIndex(index) : index;
      
      return (
        <SwiperCard
          key={keyExtractor ? keyExtractor(item, originalIndex) : index}
          cardStyle={cardStyle}
          index={index}
          disableRightSwipe={disableRightSwipe}
          disableLeftSwipe={disableLeftSwipe}
          disableTopSwipe={disableTopSwipe}
          disableBottomSwipe={disableBottomSwipe}
          translateXRange={translateXRange}
          translateYRange={translateYRange}
          rotateOutputRange={rotateOutputRange}
          rotateInputRange={rotateInputRange}
          inputOverlayLabelRightOpacityRange={
            inputOverlayLabelRightOpacityRange
          }
          outputOverlayLabelRightOpacityRange={
            outputOverlayLabelRightOpacityRange
          }
          inputOverlayLabelLeftOpacityRange={inputOverlayLabelLeftOpacityRange}
          outputOverlayLabelLeftOpacityRange={
            outputOverlayLabelLeftOpacityRange
          }
          inputOverlayLabelTopOpacityRange={inputOverlayLabelTopOpacityRange}
          outputOverlayLabelTopOpacityRange={outputOverlayLabelTopOpacityRange}
          inputOverlayLabelBottomOpacityRange={
            inputOverlayLabelBottomOpacityRange
          }
          outputOverlayLabelBottomOpacityRange={
            outputOverlayLabelBottomOpacityRange
          }
          activeIndex={activeIndex}
          OverlayLabelRight={OverlayLabelRight}
          OverlayLabelLeft={OverlayLabelLeft}
          OverlayLabelTop={OverlayLabelTop}
          OverlayLabelBottom={OverlayLabelBottom}
          ref={refs[index]}
          onSwipeRight={handleSwipeRight}
          onSwipeLeft={handleSwipeLeft}
          onSwipeTop={handleSwipeTop}
          onSwipeBottom={handleSwipeBottom}
          onSwipeStart={onSwipeStart}
          onSwipeActive={onSwipeActive}
          onSwipeEnd={onSwipeEnd}
          swipeBackXSpringConfig={swipeBackXSpringConfig}
          swipeBackYSpringConfig={swipeBackYSpringConfig}
          swipeRightSpringConfig={swipeRightSpringConfig}
          swipeLeftSpringConfig={swipeLeftSpringConfig}
          swipeTopSpringConfig={swipeTopSpringConfig}
          swipeBottomSpringConfig={swipeBottomSpringConfig}
        >
          {renderCard(item, originalIndex)}
        </SwiperCard>
      );
    })
    .reverse(); // to render cards in same hierarchy as their z-index
};

function fixedForwardRef<T, P = {}>(
  render: (props: P, ref: React.Ref<T>) => React.ReactNode
): (props: P & React.RefAttributes<T>) => React.ReactNode {
  return React.forwardRef(render) as any;
}

export default fixedForwardRef(Swiper);
