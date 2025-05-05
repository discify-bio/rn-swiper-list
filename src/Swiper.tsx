import React, { useImperativeHandle, type ForwardedRef, useMemo, useState } from 'react';
import { runOnJS, useAnimatedReaction } from 'react-native-reanimated';
import { Dimensions } from 'react-native';
import type { SwiperCardRefType, SwiperOptions } from 'rn-swiper-list';

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

// Maximum window size on each side of the current card
const MAX_WINDOW_SIZE = 3;

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
  }: SwiperOptions<T>,
  ref: ForwardedRef<SwiperCardRefType>
) => {
  const {
    activeIndex,
    refs,
    swipeRight,
    swipeLeft,
    swipeBack,
    swipeTop,
    swipeBottom,
  } = useSwipeControls(data, loop);
  
  // Track the current actual index as a state for React updates
  const [_, setCurrentIndex] = useState(0);

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

  useAnimatedReaction(
    () => {
      return activeIndex.value >= data.length;
    },
    (isSwipingFinished: boolean) => {
      if (isSwipingFinished && onSwipedAll) {
        runOnJS(onSwipedAll)();
      }
    },
    [data]
  );

  // Listen to the activeIndex value
  useAnimatedReaction(
    () => {
      return activeIndex.value;
    },
    (currentValue, previousValue) => {
      if (currentValue !== previousValue && onIndexChange) {
        runOnJS(onIndexChange)(currentValue);
      }
      
      // Also update our React state with the current index
      runOnJS(setCurrentIndex)(Math.floor(currentValue));
    },
    []
  );

  // Determine which cards to render based on the active index and window size
  const visibleIndexes = useMemo(() => {
    // Use a snapshot of the current activeIndex value
    const actualIndex = Math.min(Math.floor(activeIndex.value), data.length - 1);
    
    // Calculate the start and end indices for the window
    // Строго ограничиваем количество карточек до 3 с каждой стороны
    let startIndex = Math.max(0, actualIndex - MAX_WINDOW_SIZE);
    let endIndex = Math.min(data.length - 1, actualIndex + MAX_WINDOW_SIZE);
    
    // Create an array of indices to render
    const indexes: number[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      indexes.push(i);
    }
    
    return indexes;
  }, [activeIndex.value, data.length]);

  // Dynamic loading reaction that ensures we recompute when activeIndex changes
  useAnimatedReaction(
    () => {
      return {
        activeIndex: activeIndex.value,
        currentIndex: Math.floor(activeIndex.value)
      };
    },
    (current, previous) => {
      // This reaction will trigger recalculation of visibleIndexes
      if (previous && current.currentIndex !== previous.currentIndex) {
        // Force recalculation of visible indices when index changes significantly
        const isReachingEnd = current.currentIndex >= data.length - MAX_WINDOW_SIZE - 1;
        const isNearStart = current.currentIndex <= MAX_WINDOW_SIZE + 1;
        const needsUpdate = (isReachingEnd || isNearStart) && !loop;
        
        if (needsUpdate) {
          // Approaching the end or start, trigger React update to load more cards
          runOnJS(setCurrentIndex)(current.currentIndex);
        }
      }
    },
    [data.length, loop]
  );

  // Render only the cards within our window
  const visibleCards = useMemo(() => {
    interface CardItem {
      index: number
      element: JSX.Element
    }
    
    // Сначала соберем все карточки без сортировки
    const cards: CardItem[] = []
    
    visibleIndexes.forEach(index => {
      const item = data[index]
      // Skip rendering if item is undefined
      if (!item) return
      
      // Ensure a stable key for each card
      const cardKey = keyExtractor 
        ? keyExtractor(item, index) 
        : `card-${index}-${typeof item === 'object' ? JSON.stringify(item).slice(0, 20) : item}`
      
      cards.push({
        index,
        element: (
          <SwiperCard
            key={cardKey}
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
            onSwipeRight={cardIndex => {
              onSwipeRight?.(cardIndex)
            }}
            onSwipeLeft={cardIndex => {
              onSwipeLeft?.(cardIndex)
            }}
            onSwipeTop={cardIndex => {
              onSwipeTop?.(cardIndex)
            }}
            onSwipeBottom={cardIndex => {
              onSwipeBottom?.(cardIndex)
            }}
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
            {renderCard(item, index)}
          </SwiperCard>
        )
      })
    })
    
    // Теперь нам не нужно сортировать, так как SwiperCard компонент сам управляет z-index
    // DOM порядок не важен, так как мы используем position: absolute и z-index
    return cards.map(card => card.element)
    
  }, [
    activeIndex,
    cardStyle,
    data,
    disableBottomSwipe,
    disableLeftSwipe,
    disableRightSwipe,
    disableTopSwipe,
    inputOverlayLabelBottomOpacityRange,
    inputOverlayLabelLeftOpacityRange,
    inputOverlayLabelRightOpacityRange,
    inputOverlayLabelTopOpacityRange,
    keyExtractor,
    onSwipeActive,
    onSwipeBottom,
    onSwipeEnd,
    onSwipeLeft,
    onSwipeRight,
    onSwipeStart,
    onSwipeTop,
    outputOverlayLabelBottomOpacityRange,
    outputOverlayLabelLeftOpacityRange,
    outputOverlayLabelRightOpacityRange,
    outputOverlayLabelTopOpacityRange,
    OverlayLabelBottom,
    OverlayLabelLeft,
    OverlayLabelRight,
    OverlayLabelTop,
    refs,
    renderCard,
    rotateInputRange,
    rotateOutputRange,
    swipeBackXSpringConfig,
    swipeBackYSpringConfig,
    swipeBottomSpringConfig,
    swipeLeftSpringConfig,
    swipeRightSpringConfig,
    swipeTopSpringConfig,
    translateXRange,
    translateYRange,
    visibleIndexes,
  ])

  return visibleCards
}

function fixedForwardRef<T, P = {}>(
  render: (props: P, ref: React.Ref<T>) => React.ReactNode
): (props: P & React.RefAttributes<T>) => React.ReactNode {
  return React.forwardRef(render) as any
}

export default fixedForwardRef(Swiper);
