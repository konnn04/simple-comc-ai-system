import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  TextInput, 
  Alert,
  ScrollView,
  Platform,
  Dimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface SetUpSubjectAndTypeProps {
  navigation: any;
}

const { width } = Dimensions.get('window');

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

  const renderSubjectSelector = () => {
    if (subjectType === 'predefined') {
      return (
        <Animated.View entering={FadeInDown.delay(100)} style={styles.formGroup}>
          <Text style={styles.label}>Select Subject</Text>
          <View style={styles.pickerContainer}>
            {Platform.OS === 'android' ? (
              <View style={styles.pickerWithIcon}>
                <MaterialIcons name="category" size={22} color="#6979F8" style={styles.inputIcon} />
                <Picker
                  selectedValue={selectedSubject}
                  onValueChange={(value) => setSelectedSubject(value as string)}
                  style={styles.pickerAndroid}
                  dropdownIconColor="#6979F8"
                >
                  {predefinedSubjects.map((subject, index) => (
                    <Picker.Item key={index} label={subject} value={subject} />
                  ))}
                </Picker>
              </View>
            ) : (
              <View style={styles.pickerWithIcon}>
                <MaterialIcons name="category" size={22} color="#6979F8" style={styles.inputIcon} />
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
              </View>
            )}
          </View>
        </Animated.View>
      );
    } else {
      return (
        <Animated.View entering={FadeInDown.delay(100)} style={styles.formGroup}>
          <Text style={styles.label}>Enter Custom Subject</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="create-outline" size={22} color="#6979F8" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={customSubject}
              onChangeText={handleCustomSubjectChange}
              maxLength={50}
              placeholder="Type your subject here"
              placeholderTextColor="#A0A0A0"
            />
          </View>
          <Text style={[
            styles.helperText,
            customSubject.length >= 50 && styles.errorText
          ]}>
            {`${customSubject.length}/50 characters`}
          </Text>
        </Animated.View>
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#6979F8', '#A5AFFB']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Listening Exam</Text>
        <View style={styles.headerIcon}>
          <Ionicons name="headset" size={24} color="#FFF" />
        </View>
      </LinearGradient>
      
      <View style={styles.content}>
        <Animated.View 
          entering={FadeInDown.delay(50)}
          style={styles.formSection}
        >
          <View style={styles.sectionHeader}>
            <MaterialIcons name="subject" size={24} color="#6979F8" />
            <Text style={styles.sectionTitle}>Subject Selection</Text>
          </View>
          
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleOption,
                subjectType === 'predefined' && styles.toggleSelected
              ]}
              onPress={() => setSubjectType('predefined')}
            >
              <MaterialIcons 
                name="list" 
                size={22} 
                color={subjectType === 'predefined' ? "#FFF" : "#6979F8"} 
              />
              <Text style={[
                styles.toggleText,
                subjectType === 'predefined' && styles.toggleTextSelected
              ]}>
                Predefined
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.toggleOption,
                subjectType === 'custom' && styles.toggleSelected
              ]}
              onPress={() => setSubjectType('custom')}
            >
              <Ionicons 
                name="create" 
                size={22} 
                color={subjectType === 'custom' ? "#FFF" : "#6979F8"} 
              />
              <Text style={[
                styles.toggleText,
                subjectType === 'custom' && styles.toggleTextSelected
              ]}>
                Custom
              </Text>
            </TouchableOpacity>
          </View>
          
          {renderSubjectSelector()}
        </Animated.View>
        
        <Animated.View 
          entering={FadeInDown.delay(150)}
          style={styles.formSection}
        >
          <View style={styles.sectionHeader}>
            <FontAwesome5 name="file-audio" size={22} color="#6979F8" />
            <Text style={styles.sectionTitle}>Exam Type</Text>
          </View>
          
          <View style={styles.examTypeContainer}>
            <TouchableOpacity
              style={[
                styles.examTypeCard,
                examType === 'single' && styles.examTypeSelected
              ]}
              onPress={() => setExamType('single')}
            >
              <View style={[
                styles.examTypeIconContainer,
                examType === 'single' && styles.examTypeIconSelected
              ]}>
                <Ionicons 
                  name="person" 
                  size={28} 
                  color={examType === 'single' ? "#6979F8" : "#A0A0A0"} 
                />
              </View>
              <Text style={[
                styles.examTypeTitle,
                examType === 'single' && styles.examTypeTitleSelected
              ]}>
                Single Speech
              </Text>
              <Text style={styles.examTypeDescription}>
                One person speaking about a topic
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.examTypeCard,
                examType === 'conversation' && styles.examTypeSelected
              ]}
              onPress={() => setExamType('conversation')}
            >
              <View style={[
                styles.examTypeIconContainer,
                examType === 'conversation' && styles.examTypeIconSelected
              ]}>
                <Ionicons 
                  name="people" 
                  size={28} 
                  color={examType === 'conversation' ? "#6979F8" : "#A0A0A0"} 
                />
              </View>
              <Text style={[
                styles.examTypeTitle,
                examType === 'conversation' && styles.examTypeTitleSelected
              ]}>
                Conversation
              </Text>
              <Text style={styles.examTypeDescription}>
                Multiple people in a dialog
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
        
        <Animated.View entering={FadeInDown.delay(250)}>
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartExam}
          >
            <LinearGradient
              colors={['#6979F8', '#A5AFFB']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.startButtonText}>Start Exam</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" style={styles.buttonIcon} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  backButton: {
    padding: 5,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
  },
  headerIcon: {
    padding: 5,
  },
  content: {
    padding: 20,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    color: '#444',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F3FF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  toggleSelected: {
    backgroundColor: '#6979F8',
    shadowColor: '#6979F8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleText: {
    color: '#6979F8',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 6,
  },
  toggleTextSelected: {
    color: '#FFF',
  },
  formGroup: {
    marginTop: 5,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
    fontWeight: '500',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 5,
    overflow: 'hidden',
  },
  pickerWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
  },
  inputIcon: {
    marginRight: 10,
  },
  pickerAndroid: {
    height: 50,
    width: '100%',
    flex: 1,
    color: '#333',
  },
  pickerIOS: {
    height: 120,
    width: '100%',
    flex: 1,
  },
  pickerItemIOS: {
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
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
  examTypeContainer: {
    flexDirection: width > 500 ? 'row' : 'column',
    justifyContent: 'space-between',
    gap: 16,
  },
  examTypeCard: {
    flex: width > 500 ? 1 : undefined,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: width > 500 ? 0 : 10,
    alignItems: 'center',
  },
  examTypeSelected: {
    borderColor: '#6979F8',
    backgroundColor: '#F0F3FF',
  },
  examTypeIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  examTypeIconSelected: {
    backgroundColor: '#E6E9FF',
  },
  examTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#444',
  },
  examTypeTitleSelected: {
    color: '#6979F8',
  },
  examTypeDescription: {
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
  },
  startButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
    shadowColor: '#6979F8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonIcon: {
    marginLeft: 8,
  }
});