import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Home from '../components/Home';
import UserInfo from '../components/UserInfo';
import { useAuthUser } from '../utils/useAuthUser';

const Tab = createBottomTabNavigator();

export default function MainNavigator({ navigation }: any) {
  const { checkValidToken } = useAuthUser();

  useEffect(() => {
    (async () => {
      const isValidToken = await checkValidToken();
      if (!isValidToken) {
        navigation.navigate('Login');
      }
    })();
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;
          
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={Home} 
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Profile" 
        component={UserInfo}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
}