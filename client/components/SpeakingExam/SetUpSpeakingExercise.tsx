import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Alert,
  ScrollView,
  Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

interface SetUpSpeakingExerciseProps {
  navigation: any;
}

export default function SetUpSpeakingExercise({ navigation }: SetUpSpeakingExerciseProps) {
  const [selectedSubject, setSelectedSubject] = useState('General English');
  const [selectedDifficulty, setSelectedDifficulty] = useState(1);

  const predefinedSubjects = [
    'General English',
    'Business English',
    'Travel & Tourism',
    'Technology',
    'Entertainment',
    'Food & Cuisine',
    'Sports',
    'Anime',
    'Music',
    'Health & Medicine'
  ];

  const difficulties = [
    { value: 1, label: 'Easy' },
    { value: 2, label: 'Medium' },
    { value: 3, label: 'Hard' }
  ];

  const handleStartExercise = () => {
    navigation.navigate('SpeakingExerciseTest', {
      subject: selectedSubject,
      difficulty: selectedDifficulty
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerText}>Speaking Exercise Setup</Text>
        </View>
        
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Select Subject</Text>
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
        
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Select Difficulty</Text>
          <View style={styles.pickerContainer}>
            {Platform.OS === 'android' ? (
              <Picker
                selectedValue={selectedDifficulty}
                onValueChange={(value) => setSelectedDifficulty(Number(value))}
                style={styles.picker}
              >
                {difficulties.map((item, index) => (
                  <Picker.Item key={index} label={item.label} value={item.value} />
                ))}
              </Picker>
            ) : (
              <Picker
                selectedValue={selectedDifficulty}
                onValueChange={(value) => setSelectedDifficulty(Number(value))}
                style={styles.pickerIOS}
                itemStyle={styles.pickerItemIOS}
              >
                {difficulties.map((item, index) => (
                  <Picker.Item key={index} label={item.label} value={item.value} />
                ))}
              </Picker>
            )}
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartExercise}
        >
          <Text style={styles.startButtonText}>Start Speaking Exercise</Text>
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    backgroundColor: '#fafafa',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  pickerIOS: {
    width: '100%',
  },
  pickerItemIOS: {
    height: 120,
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
  }
});