import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  TextInput, 
  Alert,
  ScrollView,
  Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

interface SetUpSubjectAndTypeProps {
  navigation: any;
}

export default function SetUpSubjectAndType({ navigation }: SetUpSubjectAndTypeProps) {
  const [subjectType, setSubjectType] = useState('predefined');
  const [customSubject, setCustomSubject] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('General English');
  const [examType, setExamType] = useState('single');

  const predefinedSubjects = [
    'General English',
    'Business English',
    'Academic English',
    'Travel & Tourism',
    'Technology',
    'Health & Medicine'
  ];

  const handleCustomSubjectChange = (text: string) => {
    if (text.length <= 50) {
      setCustomSubject(text);
    }
  };

  const handleStartExam = () => {
    const subject = subjectType === 'custom' ? customSubject : selectedSubject;
    
    if (subjectType === 'custom' && customSubject.trim() === '') {
      Alert.alert('Error', 'Please enter a subject');
      return;
    }
    
    navigation.navigate('SingleExamTest', {
      subject,
      examType
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerText}>Listening Exam Setup</Text>
        </View>
        
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Subject Selection</Text>
          
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setSubjectType('predefined')}
            >
              <View style={[
                styles.radioButton, 
                subjectType === 'predefined' && styles.radioButtonSelected
              ]}>
                {subjectType === 'predefined' && <View style={styles.radioButtonInner} />}
              </View>
              <Text style={styles.radioLabel}>Choose from list</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setSubjectType('custom')}
            >
              <View style={[
                styles.radioButton, 
                subjectType === 'custom' && styles.radioButtonSelected
              ]}>
                {subjectType === 'custom' && <View style={styles.radioButtonInner} />}
              </View>
              <Text style={styles.radioLabel}>Custom subject</Text>
            </TouchableOpacity>
          </View>
          
          {subjectType === 'predefined' ? (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Select Subject</Text>
              <View style={styles.pickerContainer}>
                {Platform.OS === 'android' ? (
                  <Picker
                    selectedValue={selectedSubject}
                    onValueChange={(value) => setSelectedSubject(value as string)}
                    style={styles.picker}
                  >
                    {predefinedSubjects.map((subject, index) => (
                      <Picker.Item key={index} label={subject} value={subject} />
                    ))}
                  </Picker>
                ) : (
                  // iOS picker styling
                  <Picker
                    selectedValue={selectedSubject}
                    onValueChange={(value) => setSelectedSubject(value as string)}
                    style={styles.pickerIOS}
                    itemStyle={styles.pickerItemIOS}
                  >
                    {predefinedSubjects.map((subject, index) => (
                      <Picker.Item key={index} label={subject} value={subject} />
                    ))}
                  </Picker>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Enter Custom Subject</Text>
              <TextInput
                style={styles.textInput}
                value={customSubject}
                onChangeText={handleCustomSubjectChange}
                maxLength={50}
                placeholder="Type your subject here"
              />
              <Text style={[
                styles.helperText,
                customSubject.length >= 50 && styles.errorText
              ]}>
                {`${customSubject.length}/50 characters`}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Exam Type</Text>
          
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setExamType('single')}
            >
              <View style={[
                styles.radioButton, 
                examType === 'single' && styles.radioButtonSelected
              ]}>
                {examType === 'single' && <View style={styles.radioButtonInner} />}
              </View>
              <Text style={styles.radioLabel}>Single Speech</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setExamType('conversation')}
            >
              <View style={[
                styles.radioButton, 
                examType === 'conversation' && styles.radioButtonSelected
              ]}>
                {examType === 'conversation' && <View style={styles.radioButtonInner} />}
              </View>
              <Text style={styles.radioLabel}>Conversation</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartExam}
        >
          <Text style={styles.startButtonText}>Start Exam</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    marginTop: 20,
  },
  content: {
    padding: 20,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 15,
    color: '#444',
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    marginBottom: 10,
  },
  radioButton: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007bff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioButtonSelected: {
    borderColor: '#007bff',
  },
  radioButtonInner: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: '#007bff',
  },
  radioLabel: {
    fontSize: 16,
    color: '#333',
  },
  formGroup: {
    marginTop: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    backgroundColor: '#fff',
    marginBottom: 5,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  pickerIOS: {
    height: 150,
    width: '100%',
  },
  pickerItemIOS: {
    fontSize: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  helperText: {
    fontSize: 12,
    color: '#6c757d',
    alignSelf: 'flex-end',
    marginTop: 5,
  },
  errorText: {
    color: '#dc3545',
  },
  startButton: {
    backgroundColor: '#007bff',
    borderRadius: 4,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});