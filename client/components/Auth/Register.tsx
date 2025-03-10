import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal
} from 'react-native';
import { HOST } from '../../constants/server';

export default function Register({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [dob, setDob] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [alert, setAlert] = useState<{ type: string, message: string } | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Date picker values
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      setAlert({ type: 'danger', message: 'Passwords do not match' });
      return;
    }

    if (!fname.trim() || !lname.trim() || !email.trim() || !password.trim() || !dob) {
      setAlert({ type: 'danger', message: 'All fields are required' });
      return;
    }

    const data = {
      password,
      fname,
      lname,
      dob,
      email,
    };

    try {
      setIsLoading(true);
      const response = await fetch(HOST+'/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();
      if (response.ok) {
        setAlert({ type: 'success', message: 'Registration successful' });
        setTimeout(() => {
          navigation.navigate('Login');
        }, 1500);
      } else {
        setAlert({ type: 'danger', message: responseData.message });
      }
    } catch (error) {
      console.error('An error occurred:', error);
      setAlert({ type: 'danger', message: 'An error occurred. Please try again later.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Manual date selection
  const handleSetDate = () => {
    if (day && month && year) {
      // Validate date
      const dayNum = parseInt(day, 10);
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);
      
      if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900 || yearNum > new Date().getFullYear()) {
        setAlert({ type: 'danger', message: 'Invalid date' });
        return;
      }
      
      // Format date as YYYY-MM-DD for dob field
      const formattedDate = `${yearNum}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
      setDob(formattedDate);
      setShowDatePicker(false);
    } else {
      setAlert({ type: 'danger', message: 'Please fill all date fields' });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.registerContainer}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/icon.png')} 
              style={styles.logo} 
            />
            <Text style={styles.appTitle}>Register</Text>
          </View>
          
          {alert && (
            <View style={[styles.alertBox, 
              alert.type === 'danger' ? styles.alertDanger : styles.alertSuccess
            ]}>
              <Text style={alert.type === 'danger' ? styles.alertTextDanger : styles.alertTextSuccess}>
                {alert.message}
              </Text>
            </View>
          )}
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter first name"
              value={fname}
              onChangeText={setFname}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter last name"
              value={lname}
              onChangeText={setLname}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Date of Birth</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text>{dob || 'Select date of birth'}</Text>
            </TouchableOpacity>
            
            {/* Custom Date Picker Modal */}
            <Modal
              visible={showDatePicker}
              transparent={true}
              animationType="slide"
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Select Date of Birth</Text>
                  
                  <View style={styles.dateInputContainer}>
                    <View style={styles.dateInputGroup}>
                      <Text style={styles.dateLabel}>Day</Text>
                      <TextInput
                        style={styles.dateInputField}
                        keyboardType="number-pad"
                        placeholder="DD"
                        maxLength={2}
                        value={day}
                        onChangeText={setDay}
                      />
                    </View>
                    
                    <View style={styles.dateInputGroup}>
                      <Text style={styles.dateLabel}>Month</Text>
                      <TextInput
                        style={styles.dateInputField}
                        keyboardType="number-pad"
                        placeholder="MM"
                        maxLength={2}
                        value={month}
                        onChangeText={setMonth}
                      />
                    </View>
                    
                    <View style={styles.dateInputGroup}>
                      <Text style={styles.dateLabel}>Year</Text>
                      <TextInput
                        style={styles.dateInputField}
                        keyboardType="number-pad"
                        placeholder="YYYY"
                        maxLength={4}
                        value={year}
                        onChangeText={setYear}
                      />
                    </View>
                  </View>
                  
                  <View style={styles.modalButtonContainer}>
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={styles.modalButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.confirmButton]}
                      onPress={handleSetDate}
                    >
                      <Text style={styles.modalButtonText}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
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

          <View style={styles.formGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Register</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
            disabled={isLoading}
          >
            <Text style={styles.loginText}>
              Already have an account? Login
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
    padding: 20,
  },
  registerContainer: {
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
    borderWidth: 1,
  },
  alertSuccess: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: 1,
  },
  alertTextDanger: {
    color: '#721c24',
    fontSize: 16,
  },
  alertTextSuccess: {
    color: '#155724',
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
  dateInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 5,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
  },
  registerButton: {
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
  loginLink: {
    marginTop: 15,
    padding: 10,
    alignItems: 'center',
  },
  loginText: {
    color: '#007bff',
    fontSize: 16,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  dateInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dateInputGroup: {
    width: '30%',
  },
  dateLabel: {
    fontSize: 14,
    marginBottom: 5,
    textAlign: 'center',
  },
  dateInputField: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 5,
    padding: 10,
    textAlign: 'center',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    padding: 10,
    borderRadius: 5,
    width: '48%',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  confirmButton: {
    backgroundColor: '#007bff',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});