import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView,
  Platform,
  Dimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface SetUpSpeakingExerciseProps {
  navigation: any;
}

const { width } = Dimensions.get('window');

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
    { value: 1, label: 'Easy', color: '#4CAF50' },
    { value: 2, label: 'Medium', color: '#FF9800' },
    { value: 3, label: 'Hard', color: '#F44336' }
  ];

  const handleStartExercise = () => {
    navigation.navigate('SpeakingExerciseTest', {
      subject: selectedSubject,
      difficulty: selectedDifficulty
    });
  };

  const renderDifficultyCards = () => {
    return difficulties.map((item) => (
      <TouchableOpacity
        key={item.value}
        style={[
          styles.difficultyCard,
          selectedDifficulty === item.value && { borderColor: item.color, backgroundColor: `${item.color}10` }
        ]}
        onPress={() => setSelectedDifficulty(item.value)}
      >
        <View style={[styles.difficultyIconContainer, { backgroundColor: item.color }]}>
          {item.value === 1 && <Ionicons name="sunny" size={24} color="#fff" />}
          {item.value === 2 && <Ionicons name="pulse" size={24} color="#fff" />}
          {item.value === 3 && <FontAwesome5 name="fire" size={24} color="#fff" />}
        </View>
        <Text style={[
          styles.difficultyLabel,
          selectedDifficulty === item.value && { fontWeight: '600', color: item.color }
        ]}>
          {item.label}
        </Text>
        {selectedDifficulty === item.value && (
          <Ionicons name="checkmark-circle" size={20} color={item.color} style={styles.checkIcon} />
        )}
      </TouchableOpacity>
    ));
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#FF6B6B', '#FF8E53']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Speaking Practice</Text>
        <View style={styles.headerIcon}>
          <Ionicons name="mic" size={24} color="#FFF" />
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <Animated.View 
          entering={FadeInDown.delay(50).duration(300)}
          style={styles.formSection}
        >
          <View style={styles.sectionHeader}>
            <MaterialIcons name="category" size={24} color="#FF6B6B" />
            <Text style={styles.sectionTitle}>Choose a Subject</Text>
          </View>
          
          <View style={styles.pickerContainer}>
            {Platform.OS === 'android' ? (
              <View style={styles.pickerWithIcon}>
                <MaterialIcons name="topic" size={22} color="#FF6B6B" style={styles.inputIcon} />
                <Picker
                  selectedValue={selectedSubject}
                  onValueChange={(value) => setSelectedSubject(value as string)}
                  style={styles.pickerAndroid}
                  dropdownIconColor="#FF6B6B"
                >
                  {predefinedSubjects.map((subject, index) => (
                    <Picker.Item key={index} label={subject} value={subject} />
                  ))}
                </Picker>
              </View>
            ) : (
              <View style={styles.pickerWithIcon}>
                <MaterialIcons name="topic" size={22} color="#FF6B6B" style={styles.inputIcon} />
                <Picker
                  selectedValue={selectedSubject}
                  onValueChange={(value) => setSelectedSubject(value as string)}
                  style={styles.pickerIOS}
                >
                  {predefinedSubjects.map((subject, index) => (
                    <Picker.Item key={index} label={subject} value={subject} />
                  ))}
                </Picker>
              </View>
            )}
          </View>
        </Animated.View>
        
        <Animated.View 
          entering={FadeInDown.delay(150).duration(300)}
          style={styles.formSection}
        >
          <View style={styles.sectionHeader}>
            <FontAwesome5 name="chart-line" size={20} color="#FF6B6B" />
            <Text style={styles.sectionTitle}>Select Difficulty</Text>
          </View>
          
          <View style={styles.difficultyContainer}>
            {renderDifficultyCards()}
          </View>
        </Animated.View>
        
        <Animated.View 
          entering={FadeInDown.delay(250).duration(300)}
          style={styles.infoSection}
        >
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="information-circle" size={24} color="#FF6B6B" />
            </View>
            <Text style={styles.infoText}>
              You'll be given speaking prompts based on your selected topic and difficulty level.
              Speak clearly and naturally when answering questions.
            </Text>
          </View>
        </Animated.View>
        
        <Animated.View entering={FadeInDown.delay(350).duration(300)}>
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartExercise}
          >
            <LinearGradient
              colors={['#FF6B6B', '#FF8E53']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.startButtonText}>Start Practice Session</Text>
              <Ionicons name="mic" size={20} color="#FFF" style={styles.buttonIcon} />
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#fff',
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
  difficultyContainer: {
    flexDirection: width > 500 ? 'row' : 'column',
    justifyContent: 'space-between',
    gap: 10,
  },
  difficultyCard: {
    flex: width > 500 ? 1 : undefined,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginBottom: width > 500 ? 0 : 10,
    backgroundColor: '#fff',
  },
  difficultyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  difficultyLabel: {
    fontSize: 16,
    color: '#555',
    flex: 1,
  },
  checkIcon: {
    marginLeft: 5,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B6B',
  },
  infoIconContainer: {
    marginRight: 15,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
    lineHeight: 20,
  },
  startButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
    shadowColor: '#FF6B6B',
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
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 8,
  }
});