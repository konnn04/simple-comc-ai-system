import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';

interface LoadingProps {
  styleType?: number;
}

const Loading: React.FC<LoadingProps> = ({ styleType = 0 }) => {
  // Choose color based on styleType
  const getLoaderColor = () => {
    switch(styleType) {
      case 0:
        return '#E3AAD6';
      case 1:
        return '#F77825';
      case 2:
        return '#25b09b';
      default:
        return '#2196F3';
    }
  };

  // Choose size based on styleType
  const getLoaderSize = () => {
    switch(styleType) {
      case 0:
        return 'small';
      case 1:
        return 'large';
      case 2:
        return 'large';
      default:
        return 'large';
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator 
        size={getLoaderSize()} 
        color={getLoaderColor()} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});

export default Loading;