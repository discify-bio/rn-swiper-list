import { createRef, useCallback, useEffect, useMemo, useRef, type RefObject } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import type { SwiperCardRefType } from 'rn-swiper-list';

// Максимальное количество карточек для возврата назад
const MAX_BACK_STEPS = 3;

const useSwipeControls = <T>(data: T[], loop: boolean = false) => {
  const activeIndex = useSharedValue(0);
  const initialRender = useRef(true);
  // Сохраняем историю индексов для правильного ограничения возврата
  const indexHistory = useRef<number[]>([0]);

  // Create refs for all cards
  const refs = useMemo(() => {
    let cardRefs: RefObject<SwiperCardRefType>[] = [];

    for (let i = 0; i < data.length; i++) {
      cardRefs.push(createRef<SwiperCardRefType>());
    }
    return cardRefs;
  }, [data]);

  // Ensure refs array is updated if data changes
  useEffect(() => {
    // Skip on first render
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }

    // Reset activeIndex if data changes and current index is out of bounds
    if (activeIndex.value >= data.length) {
      activeIndex.value = 0;
      indexHistory.current = [0];
    }
  }, [data, activeIndex]);

  const updateActiveIndex = useCallback(() => {
    if (loop && activeIndex.value >= data.length - 1) {
      // Handle looping - reset cards
      for (let i = 0; i < data.length; i++) {
        refs[i]?.current?.swipeBack();
      }
      // Reset active index with slight delay to allow animation
      setTimeout(() => {
        activeIndex.value = 0;
        // Обновляем историю индексов при сбросе
        indexHistory.current = [0];
      }, 100);
    } else {
      // Regular increment
      const newIndex = Math.min(activeIndex.value + 1, data.length);
      activeIndex.value = newIndex;
      
      // Добавляем новый индекс в историю
      indexHistory.current.push(Math.floor(newIndex));
      // Ограничиваем размер истории
      if (indexHistory.current.length > MAX_BACK_STEPS + 1) {
        indexHistory.current = indexHistory.current.slice(-MAX_BACK_STEPS - 1);
      }
    }
  }, [activeIndex, data.length, loop, refs]);

  const swipeRight = useCallback(() => {
    const currentIndex = Math.floor(activeIndex.value);
    if (!refs[currentIndex]?.current) {
      return;
    }
    refs[currentIndex]?.current?.swipeRight();
    updateActiveIndex();
  }, [activeIndex.value, refs, updateActiveIndex]);

  const swipeTop = useCallback(() => {
    const currentIndex = Math.floor(activeIndex.value);
    if (!refs[currentIndex]?.current) {
      return;
    }
    refs[currentIndex]?.current?.swipeTop();
    updateActiveIndex();
  }, [activeIndex.value, refs, updateActiveIndex]);

  const swipeLeft = useCallback(() => {
    const currentIndex = Math.floor(activeIndex.value);
    if (!refs[currentIndex]?.current) {
      return;
    }
    refs[currentIndex]?.current?.swipeLeft();
    updateActiveIndex();
  }, [activeIndex.value, refs, updateActiveIndex]);

  const swipeBottom = useCallback(() => {
    const currentIndex = Math.floor(activeIndex.value);
    if (!refs[currentIndex]?.current) {
      return;
    }
    refs[currentIndex]?.current?.swipeBottom();
    updateActiveIndex();
  }, [activeIndex.value, refs, updateActiveIndex]);

  const swipeBack = useCallback(() => {
    // Получаем историю индексов
    const history = indexHistory.current;
    
    // Если история только из 1 элемента или меньше, возврат невозможен
    if (history.length <= 1) {
      return;
    }
    
    // Проверяем, можем ли вернуться назад (не больше чем на MAX_BACK_STEPS)
    const previousIndex = history[history.length - 2];
    
    // Проверка, что previousIndex существует
    if (previousIndex === undefined || (!loop && (previousIndex < 0 || !refs[previousIndex]))) {
      return;
    }

    // Handle looping for swipe back
    const targetIndex = previousIndex < 0 ? data.length - 1 : previousIndex;

    if (refs[targetIndex]?.current) {
      refs[targetIndex]?.current?.swipeBack();
      activeIndex.value = targetIndex;
      
      // Удаляем текущий индекс из истории
      indexHistory.current = history.slice(0, -1);
    }
  }, [activeIndex, refs, data.length, loop]);

  return {
    activeIndex,
    refs,
    swipeRight,
    swipeLeft,
    swipeBack,
    swipeTop,
    swipeBottom,
  };
};

export default useSwipeControls;
