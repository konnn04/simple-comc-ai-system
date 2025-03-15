import React from 'react';
import { StyleSheet, View, Text, Image, SafeAreaView } from 'react-native';
import Loading from '../components/Loading';

export default function LoadingNavigator() {
  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/icon.png')} 
            style={styles.logo} 
          />
          <Text style={styles.appTitle}>English Learning App</Text>
        </View>
        <Loading />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 100,
    height: 100, 
    marginBottom: 15,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '500',
    marginBottom: 10,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: '#000',
  }
});