import React from 'react';
import { View, StyleSheet } from 'react-native';

interface LoadingProps {
  styleType?: number;
}

const Loading: React.FC<LoadingProps> = ({ styleType = 0 }) => {
  return (
    <View style={styles.container}>
      <div className={`loader style-${styleType}`}></div>
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