import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useAuthUser } from '../../utils/useAuthUser';
import { HOST } from '../../constants/server';

interface LoginProps {
  navigation: any;
}

export default function Login({ navigation }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { saveAuthUser } = useAuthUser();
  const [alert, setAlert] = useState<{ type: string, message: string } | null>(null);

  const handleLogin = async () => {
    try {
      if (!username.trim() || !password.trim()) {
        setAlert({ type: 'danger', message: 'Username and password are required' });
        return;
      }
      
      // Check API connection first
      console.log(`Attempting to connect to ${HOST}`);
      
      const response = await fetch(HOST+'auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          'usernameOrEmail': username,
          password,
        }),
      });
  
      // For debugging, get the text response first
      const responseText = await response.text();
      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);
      
      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        console.log("Raw response:", responseText.substring(0, 200)); // Show first 200 chars
        throw new Error("Server returned invalid JSON. Please check the API endpoint.");
      }
  
      if (response.ok) {
        await saveAuthUser({
          token: data.token,
          fname: data.fname,
          lname: data.lname,
          avatar: data.avatar,
        });
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      } else {
        setAlert({ type: 'danger', message: data.message || 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unable to connect to server';
      setAlert({ 
        type: 'danger', 
        message: `Connection error: ${errorMessage}`
      });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.loginContainer}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/icon.png')} 
              style={styles.logo} 
            />
            <Text style={styles.appTitle}><Text style={{color:"green"}}>Neuro</Text> English</Text>
          </View>

          {alert && (
            <View style={[styles.alertBox, 
              alert.type === 'danger' ? styles.alertDanger : styles.alertSuccess
            ]}>
              <Text style={styles.alertText}>{alert.message}</Text>
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity 
            style={styles.loginButton} 
            onPress={handleLogin}
          >
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.registerLink}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerText}>
              Don't have an account? Register
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loginContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 15,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
  },
  alertBox: {
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
  },
  alertDanger: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
  alertSuccess: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  alertText: {
    color: '#721c24',
    fontSize: 16,
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 5,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  loginButton: {
    backgroundColor: '#007bff',
    borderRadius: 5,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  registerLink: {
    marginTop: 15,
    padding: 10,
    alignItems: 'center',
  },
  registerText: {
    color: '#007bff',
    fontSize: 16,
  }
});