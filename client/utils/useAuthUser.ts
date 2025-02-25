import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthUser {
  token: string | null;
  fname: string | null;
  lname: string | null;
  avatar: string | null;
}

export const useAuthUser = () => {
  const [authUser, setAuthUser] = useState<AuthUser>({
    token: null,
    fname: null,
    lname: null,
    avatar: null,
  });

  useEffect(() => {
    const fetchAuthUser = async () => {
      const token = await AsyncStorage.getItem('authToken');
      const fname = await AsyncStorage.getItem('authFname');
      const lname = await AsyncStorage.getItem('authLname');
      const avatar = await AsyncStorage.getItem('authAvatar');
      setAuthUser({ token, fname, lname, avatar });
    };
    fetchAuthUser();
  }, []);

  // Set the auth user in async storage
  const saveAuthUser = async (user: AuthUser) => {
    await AsyncStorage.setItem('authToken', user.token || '');
    await AsyncStorage.setItem('authFname', user.fname || '');
    await AsyncStorage.setItem('authLname', user.lname || '');
    await AsyncStorage.setItem('authAvatar', user.avatar || '');
    setAuthUser(user);
  };

  // Remove the auth user from async storage
  const clearAuthUser = async () => {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('authFname');
    await AsyncStorage.removeItem('authLname');
    await AsyncStorage.removeItem('authAvatar');
    setAuthUser({ token: null, fname: null, lname: null, avatar: null });
  };

  const checkValidToken = async () => {
    const token = await AsyncStorage.getItem('authToken');
    if (!token) {
      return false;
    }
    try {
      const response = await fetch('http://localhost:5000/auth/verify', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        return true;
      }else{
        clearAuthUser();
        return false;
      }
    } catch (error) {
      console.error('An error occurred:', error);
      return false;
    }
  }
  return { authUser, saveAuthUser, clearAuthUser, checkValidToken };
};