import { HOST } from '../constants/server';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ApiOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

/**
 * Make an authenticated API call with automatic token validation
 * @param endpoint API endpoint (without host)
 * @param options Request options
 * @param navigation Navigation object for redirection on token invalidation
 * @returns Promise with the API response
 */
export const authenticatedFetch = async (
  endpoint: string,
  options: ApiOptions = {},
  navigation: any = null
) => {
  try {
    const token = await AsyncStorage.getItem('authToken');
    
    if (!token) {
      // No token found, redirect to login
      handleLogout(navigation);
      throw new Error('Authentication token not found');
    }

    // Prepare headers 
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': options.headers?.['Content-Type'] || 'application/json',
      'ngrok-skip-browser-warning': 'true'
    };

    // Make the request
    const response = await fetch(`${HOST}${endpoint}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? options.body : undefined,
    });

    // Check for authentication errors (401 Unauthorized or 403 Forbidden)
    if (response.status === 401 || response.status === 403) {
      // Token is invalid or expired
      console.log('Authentication failed:', response.status);
      handleLogout(navigation);
      throw new Error('Authentication failed');
    }

    return response;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

/**
 * Handle logout by clearing AsyncStorage and redirecting to login
 * @param navigation Navigation object for redirection
 */
export const handleLogout = async (navigation: any) => {
  try {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('authFname');
    await AsyncStorage.removeItem('authLname');
    await AsyncStorage.removeItem('authAvatar');
    
    // Only navigate if navigation object is provided
    if (navigation) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
    }
  } catch (error) {
    console.error('Error during logout:', error);
  }
};