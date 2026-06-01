import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
}

// Transparent wrapper — the root View in App.tsx provides the themed background.
export function ThemedScreen({ children, style, edges }: Props) {
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: 'transparent' }, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}
