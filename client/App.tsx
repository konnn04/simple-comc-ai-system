import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useAuthUser } from './utils/useAuthUser';
import AuthNavigator from './navigations/AuthNavigator';
import MainNavigator from './navigations/MainNavigator';
import LoadingNavigator from './navigations/LoadingNavigator';

const Stack = createNativeStackNavigator();

export default function App() {
  const { checkValidToken } = useAuthUser();
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    const checkToken = async () => {
      const isValidToken = await checkValidToken();
      setInitialRoute(isValidToken ? 'Main' : 'Auth');
    };
    checkToken();
  }, []);

  if (initialRoute === null) {
    return <LoadingNavigator />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen 
          name="Auth" 
          component={AuthNavigator} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="Main" 
          component={MainNavigator}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}