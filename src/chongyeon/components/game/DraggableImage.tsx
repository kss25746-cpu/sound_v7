"use no memo";

// A는 React Compiler가 켜져 있고(app.json experiments.reactCompiler) B는 아니었다.
// 이 파일은 렌더 중 ref 읽기 등 컴파일러가 가정하는 규칙을 어긴다. 그대로 컴파일하면
// 잘못 메모이즈될 수 있어 **명시적으로 옵트아웃한다.** 규칙을 맞춰 고치면 이 줄을 지운다.

import React, { useRef, useState } from 'react';
import { Animated, Image, PanResponder, StyleSheet } from 'react-native';
import * as og from '../../constants/orderGameLayout';
import { opacity } from '../../constants/orderGameTheme';

export interface DraggableImageProps {
  image: any;
  index: number;
  name: string;
  onDrop: (imageIndex: number, targetZoneIndex: number, sourceZoneIndex?: number) => boolean | void;
  onDragStart?: (sourceZoneIndex?: number) => void;
  onDragEnd?: () => void;
  disabled?: boolean;
  sourceZoneIndex?: number;
  checkDropZone: (x: number, y: number) => number;
  debug?: boolean;
}

export default function DraggableImage({
  image,
  index,
  name: imageName,
  onDrop,
  onDragStart,
  onDragEnd,
  disabled,
  sourceZoneIndex,
  checkDropZone,
  debug = false,
}: DraggableImageProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const [isDragging, setIsDragging] = useState(false);
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  // 처리기는 첫 렌더에 한 번만 만든다. 그 안에서 props를 바로 읽으면 첫 값에 묶여,
  // 순서 칸의 동물이 바뀐 뒤 끌면 **처음 놓였던 동물**로 옮겨진다(같은 동물이 두 칸).
  // 그래서 놓는 순간에 최신 값을 읽도록 ref로 들고 있는다.
  const latestRef = useRef({ index, imageName, onDrop, onDragStart, onDragEnd, sourceZoneIndex, checkDropZone, debug });
  latestRef.current = { index, imageName, onDrop, onDragStart, onDragEnd, sourceZoneIndex, checkDropZone, debug };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onPanResponderGrant: () => {
        setIsDragging(true);
        latestRef.current.onDragStart?.(latestRef.current.sourceZoneIndex);
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (e, gestureState) => {
        const { index, imageName, onDrop, onDragEnd, sourceZoneIndex, checkDropZone, debug } = latestRef.current;
        const x = e.nativeEvent.pageX ?? gestureState.moveX;
        const y = e.nativeEvent.pageY ?? gestureState.moveY;
        const dropZoneIndex = checkDropZone(x, y);
        if (debug) {
          console.log('[DROP] release', {
            imageName,
            pageX: e.nativeEvent.pageX,
            pageY: e.nativeEvent.pageY,
            moveX: gestureState.moveX,
            moveY: gestureState.moveY,
            used: { x, y },
            dropZoneIndex,
          });
        }
        const consumed = onDrop(index, dropZoneIndex, sourceZoneIndex);
        if (consumed && sourceZoneIndex === undefined) {
          pan.setValue({ x: 0, y: 0 });
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        }
        setIsDragging(false);
        onDragEnd?.();
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      accessible={true}
      accessibilityRole="imagebutton"
      // 순서 칸에 놓인 카드는 몇 번째인지까지 읽는다 (그리드에 있는 것은 이름만)
      accessibilityLabel={
        sourceZoneIndex !== undefined ? `${sourceZoneIndex + 1}번째 자리, ${imageName}` : imageName
      }
      accessibilityState={{ disabled: !!disabled }}
      accessibilityHint="끌어서 순서 칸에 놓습니다"
      style={[
        { transform: pan.getTranslateTransform() },
        styles.imageContainer,
        isDragging && { zIndex: og.zIndex.draggedCard, elevation: og.zIndex.draggedCard },
      ]}
    >
      <Image source={image} style={[styles.image, disabled && { opacity: opacity.droppedCard }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    width: og.card.size,
    height: og.card.size,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: og.card.imageSize,
    height: og.card.imageSize,
  },
});
