import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { authenticatedFetch } from '../../utils/api';
import { NavigationProp, ParamListBase } from '@react-navigation/native';

interface Question {
  id?: number;
  difficulty: number;
  question: string;
  topic: string;
}

const difficultyLabels = ['Easy', 'Medium', 'Hard'];
export default function ListQuestionsScreen({ navigation }: { navigation: NavigationProp<ParamListBase> }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState(0);
  const [count, setCount] = useState('10');
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // Suggested topics
  const suggestedTopics = [
    'Daily Life', 
    'Travel', 
    'Technology', 
    'Education',
    'Health',
    'Environment',
    'Work & Career',
    'Entertainment',
    'Food & Cuisine',
    'Social Media'
  ];

  // Fetch random questions when component mounts or refreshes
  const fetchRandomQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch(`api/speaking-questions/random?count=10`, {}, navigation);
      
      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }
      
      const data = await response.json();
      setQuestions(data.questions);
    } catch (error) {
      console.error('Error fetching questions:', error);
      Alert.alert('Error', 'Failed to load questions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  // Reset and fetch on screen focus
  useFocusEffect(
    useCallback(() => {
      fetchRandomQuestions();
    }, [fetchRandomQuestions])
  );

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRandomQuestions();
  }, [fetchRandomQuestions]);

  // Generate questions with AI
  const generateQuestions = async () => {
    if (!topic.trim()) {
      Alert.alert('Error', 'Please enter a topic');
      return;
    }

    const countNum = parseInt(count);
    if (isNaN(countNum) || countNum < 1 || countNum > 20) {
      Alert.alert('Error', 'Please enter a valid number of questions (1-20)');
      return;
    }

    try {
      setGeneratingQuestions(true);
      setShowGenerateModal(false);
      
      const response = await authenticatedFetch('api/speaking-questions/generate', {
        method: 'POST',
        body: JSON.stringify({
          topic: topic,
          difficulty: difficulty,
          count: countNum
        })
      }, navigation);

      if (!response.ok) {
        throw new Error('Failed to generate questions');
      }

      const data = await response.json();
      setQuestions(data.questions);
      Alert.alert('Success', `Generated ${data.questions.length} questions on "${topic}"`);

    } catch (error) {
      console.error('Error generating questions:', error);
      Alert.alert('Error', 'Failed to generate questions');
    } finally {
      setGeneratingQuestions(false);
    }
  };

  // Handle question selection
  const handleSelectQuestion = (question: Question) => {
    navigation.navigate('SpeakingPractice', { question });
  };

  // Render question item
  const renderQuestionItem = ({ item }: { item: Question }) => (
    <TouchableOpacity 
      style={styles.questionCard}
      onPress={() => handleSelectQuestion(item)}
    >
      <View style={styles.questionHeader}>
        <Text style={styles.topicText}>{item.topic}</Text>
        <View style={[
          styles.difficultyBadge, 
          { backgroundColor: item.difficulty === 0 ? '#4CAF50' : item.difficulty === 1 ? '#FF9800' : '#F44336' }
        ]}>
          <Text style={styles.difficultyText}>
            {difficultyLabels[item.difficulty]}
          </Text>
        </View>
      </View>
      <Text style={styles.questionText}>{item.question}</Text>
      <View style={styles.cardFooter}>
        <TouchableOpacity 
          style={styles.practiceButton}
          onPress={() => handleSelectQuestion(item)}
        >
          <Ionicons name="mic-outline" size={16} color="#fff" />
          <Text style={styles.practiceButtonText}>Practice</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // Generate Questions Modal
  const renderGenerateModal = () => (
    <Modal
      visible={showGenerateModal}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Generate Questions</Text>
          
          <Text style={styles.inputLabel}>Topic</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter a topic"
            value={topic}
            onChangeText={setTopic}
          />
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.topicsContainer}>
            {suggestedTopics.map((t, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.topicChip}
                onPress={() => setTopic(t)}
              >
                <Text style={styles.topicChipText}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <Text style={styles.inputLabel}>Difficulty</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={difficulty}
              onValueChange={(itemValue) => setDifficulty(Number(itemValue))}
              style={styles.picker}
            >
              {difficultyLabels.map((label, index) => (
                <Picker.Item key={index} label={label} value={index} />
              ))}
            </Picker>
          </View>
          
          <Text style={styles.inputLabel}>Number of Questions (1-20)</Text>
          <TextInput
            style={styles.input}
            placeholder="Number of questions"
            value={count}
            onChangeText={setCount}
            keyboardType="number-pad"
            maxLength={2}
          />
          
          <View style={styles.modalButtonsContainer}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]} 
              onPress={() => setShowGenerateModal(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.generateButton]} 
              onPress={generateQuestions}
            >
              <Text style={styles.modalButtonText}>Generate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Speaking Practice</Text>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={onRefresh}
        >
          <Ionicons name="refresh-outline" size={24} color="#2196F3" />
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity
        style={styles.generateQuestionsButton}
        onPress={() => setShowGenerateModal(true)}
      >
        <Ionicons name="bulb-outline" size={20} color="#fff" />
        <Text style={styles.generateButtonText}>Generate Questions</Text>
      </TouchableOpacity>

      {generatingQuestions ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Generating questions...</Text>
        </View>
      ) : loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading questions...</Text>
        </View>
      ) : (
        <FlatList
          data={questions}
          renderItem={renderQuestionItem}
          keyExtractor={(item) => (item.id ? item.id.toString() : Math.random().toString())}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={["#2196F3"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No questions available</Text>
              <TouchableOpacity 
                style={styles.emptyRefreshButton}
                onPress={fetchRandomQuestions}
              >
                <Text style={styles.emptyRefreshText}>Tap to refresh</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
      
      {renderGenerateModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
  },
  generateQuestionsButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  generateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  topicText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  questionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  practiceButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  practiceButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptyRefreshButton: {
    padding: 10,
  },
  emptyRefreshText: {
    color: '#2196F3',
    fontSize: 14,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  generateButton: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  topicsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  topicChip: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
  },
  topicChipText: {
    fontSize: 14,
    color: '#333',
  },
});