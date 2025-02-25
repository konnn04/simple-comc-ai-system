import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Login from '../components/Auth/Login';
import Register from '../components/Auth/Register';
import { useAuthUser } from '../utils/useAuthUser';

const Stack = createNativeStackNavigator();

export default function AuthNavigator({ navigation }: any) {
  const { authUser, checkValidToken } = useAuthUser();
  useEffect(() => {
    (async () => {  
      const isValidToken = await checkValidToken();
      if (isValidToken) {
        navigation.navigate('Main');
      }
    })();
  }, [authUser]);
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen 
        name="Login" 
        component={Login} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen
        name="Register"
        component={Register}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}