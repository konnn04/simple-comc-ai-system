import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, BackHandler, ActivityIndicator, ScrollView, AppState } from 'react-native';
import { useAuthUser } from '../../utils/useAuthUser';
import { HOST } from '../../constants/server';
import { authenticatedFetch } from '../../utils/api';

interface Question {
  id: number;
  question: string;
  options: string[];
}

interface ExamData {
  questions: Question[];
  message: string;
  duration: number; // Duration in seconds
}

export default function ExamQuiz({ navigation }: any) {
  const { authUser } = useAuthUser();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(3600); // Default 60 minutes
  const [warnTime, setWarnTime] = useState<number>(300); // Warn when 5 minutes remaining
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Fetch questions from API
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        const response = await authenticatedFetch(
          'api/get-ai-exam',
          { method: 'GET' },
          navigation
        );

        if (!response.ok) {
          throw new Error('Failed to fetch exam questions');
        }

        const data: ExamData = await response.json();
        setQuestions(data.questions);
        setTimeRemaining(data.duration || 3600);
        setWarnTime(Math.round(data.duration / 6)); // Warn when 1/6th of time remaining
        // Initialize selectedAnswers array with -1 (no selection) for each question
        setSelectedAnswers(Array(data.questions.length).fill(-1));

      } catch (error) {
        console.error('Error fetching questions:', error);
        setError('Failed to load exam questions. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (loading || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, timeRemaining]);

  // Handle time up
  const handleTimeUp = useCallback(() => {
    Alert.alert(
      'Time\'s Up!',
      'Your exam time has expired. Your answers will be submitted automatically.',
      [{ text: 'OK', onPress: handleSubmit }]
    );
  }, [selectedAnswers, questions]);

  // Setup back button warning
  useEffect(() => {
    const backAction = () => {
      Alert.alert(
        'Exit Exam',
        'Are you sure you want to exit? Your progress will be lost.',
        [
          { text: 'Cancel', onPress: () => null, style: 'cancel' },
          { text: 'Exit', onPress: () => navigation.goBack() },
        ]
      );
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => backHandler.remove();
  }, []);

  // Prevent tab switching
  useEffect(() => {
      const subscription = AppState.addEventListener('change', nextAppState => {
        if (nextAppState === 'inactive' || nextAppState === 'background') {
          Alert.alert(
            'Exit Exam',
            'Are you sure you want to exit? Your progress will be lost.',
            [
              { text: 'Cancel', onPress: () => null, style: 'cancel' },
              { text: 'Exit', onPress: () => navigation.goBack() },
            ]
          );
        }
      });
      
      return () => subscription.remove();
  }, []);

  const handleSelectAnswer = (answerIndex: number) => {
    // Convert numeric index to letter (0 -> 'A', 1 -> 'B', etc)
    const letters = ['A', 'B', 'C', 'D'];
    const letterAnswer = letters[answerIndex];

    const newSelectedAnswers = [...selectedAnswers];
    newSelectedAnswers[currentQuestionIndex] = answerIndex;
    setSelectedAnswers(newSelectedAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    // Don't submit if already submitting
    if (isSubmitting) return;

    // Check if all questions are answered
    if (selectedAnswers.includes(-1)) {
      Alert.alert(
        'Incomplete Exam',
        'You have not answered all questions. Do you want to submit anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit', onPress: submitExam }
        ]
      );
    } else {
      submitExam();
    }
  };

  const submitExam = async () => {
    try {
      setIsSubmitting(true);
      // Make sure API call sends data in the format expected by the server
      const response = await authenticatedFetch('api/submit-exam', {
        method: 'POST',
        body: JSON.stringify({
          answers: selectedAnswers
        }),
      }, navigation);

      if (!response.ok) {
        throw new Error('Failed to submit exam');
      }

      const result = await response.json();

      // Navigate to results page with the data
      navigation.navigate('ExamResults', {
        score: result.score,
        exam: result.exam,
        u_answers: result.u_answers,
        message: result.message,
      });

    } catch (error) {
      console.error('Error submitting exam:', error);
      Alert.alert('Error', 'Failed to submit your exam. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  // Count answered questions
  const answeredCount = selectedAnswers.filter(answer => answer !== -1).length;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading exam questions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.navButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>No questions available for this exam.</Text>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.navButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Exam Quiz</Text>
        <View style={styles.timerContainer}>
          <Text style={
            timeRemaining < warnTime ? styles.timerTextWarning : styles.timerText
          }>
            Time: {formatTime(timeRemaining)}
          </Text>
        </View>
      </View>

      <View style={styles.progressInfo}>
        <Text style={styles.progressText}>
          Question {currentQuestionIndex + 1} of {questions.length}
        </Text>
        <Text style={styles.progressText}>
          Answered: {answeredCount}/{questions.length}
        </Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(answeredCount / questions.length) * 100}%` }
            ]}
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.questionNavContainer}>
        {questions.map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.questionNumButton,
              selectedAnswers[index] !== -1 ? styles.answeredQuestionButton : styles.unansweredQuestionButton,
              currentQuestionIndex === index ? styles.currentQuestionButton : null
            ]}
            onPress={() => goToQuestion(index)}
          >
            <Text
              style={[
                styles.questionNumText,
                currentQuestionIndex === index ? styles.currentQuestionText : null
              ]}
            >
              {index + 1}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>

        {currentQuestion.options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.optionButton,
              selectedAnswers[currentQuestionIndex] === index ? styles.selectedOption : null
            ]}
            onPress={() => handleSelectAnswer(index)}
          >
            <Text style={styles.optionLetter}>{String.fromCharCode(65 + index)}</Text>
            <Text style={styles.optionText}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[styles.navButton, currentQuestionIndex === 0 ? styles.disabledButton : null]}
          onPress={handlePrevQuestion}
          disabled={currentQuestionIndex === 0}
        >
          <Text style={styles.navButtonText}>Previous</Text>
        </TouchableOpacity>

        {currentQuestionIndex === questions.length - 1 ? (
          <TouchableOpacity
            style={[styles.navButton, styles.submitButton, isSubmitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.navButtonText}>
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.navButton}
            onPress={handleNextQuestion}
          >
            <Text style={styles.navButtonText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  timerContainer: {
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  timerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  timerTextWarning: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f44336',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  questionContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  questionText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
  },
  selectedOption: {
    backgroundColor: '#bbdefb',
    borderColor: '#1976d2',
    borderWidth: 1,
  },
  optionText: {
    fontSize: 16,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  navButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  navButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 20,
  },
  questionNavContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    maxHeight: 50,
    flexShrink: 0,
  },
  questionNumButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginVertical: 5,
  },
  unansweredQuestionButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cccccc',
  },
  answeredQuestionButton: {
    backgroundColor: '#4CAF50',
  },
  currentQuestionButton: {
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  questionNumText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  currentQuestionText: {
    color: '#2196F3',
  },
  optionLetter: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
});