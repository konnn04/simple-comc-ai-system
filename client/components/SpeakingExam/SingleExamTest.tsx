import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, Alert, BackHandler, ActivityIndicator } from 'react-native';
import { authenticatedFetch } from '../../utils/api';
import { HOST } from '../../constants/server';

interface Question {
  question: string;
  type: string;
  options?: string[];
  correct_answer: string | boolean;
  explanation: string;
}

interface SpeakingTest {
  audio: {
    filename: string;
    full_path: string;
  };
  questions: Question[];
  text: string;
}

interface SingleExamTestProps {
  navigation: any;
  route: any;
}

export default function SingleExamTest({ navigation, route }: SingleExamTestProps) {
  const { subject, examType } = route.params;
  const [test, setTest] = useState<SpeakingTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [playCount, setPlayCount] = useState(0);
  const [answers, setAnswers] = useState<(string | boolean | number)[]>([]);
  const [fillInAnswers, setFillInAnswers] = useState<{ [key: number]: string }>({});
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Fetch test data
  useEffect(() => {
    const fetchTest = async () => {
      try {
        setLoading(true);
        const response = await authenticatedFetch(
          `api/get-speaking-test?subject=${encodeURIComponent(subject)}&type=${examType}`,
          { method: 'GET' },
          navigation
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch speaking test');
        }
        
        const data = await response.json();
        setTest(data);
        
        // Initialize answers array based on question types
        const initialAnswers = data.questions.map((q: Question) => {
          if (q.type === 'multiple_choice') return -1;
          if (q.type === 'true_or_false') return null;
          return '';
        });
        setAnswers(initialAnswers);
        
      } catch (error) {
        console.error('Error fetching speaking test:', error);
        setError('Failed to load speaking test. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTest();
  }, [subject, examType]);
  
  // Time tracking
  useEffect(() => {
    if (loading || !test) return;
    
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [loading, test]);
  
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

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);
  
  // Prevent tab switching
  useEffect(() => {
    const beforeUnloadListener = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return event.returnValue;
    };

    window.addEventListener('beforeunload', beforeUnloadListener);
    return () => {
      window.removeEventListener('beforeunload', beforeUnloadListener);
    };
  }, []);
  
  const handlePlayAudio = () => {
    if (playCount >= 3) {
      Alert.alert('Limit Reached', 'You can only play the audio 3 times');
      return;
    }
    
    if (audioRef.current) {
      audioRef.current.play();
      setPlayCount(prev => prev + 1);
    }
  };
  
  const handleSelectAnswer = (questionIndex: number, answerValue: string | boolean | number) => {
    const newAnswers = [...answers];
    newAnswers[questionIndex] = answerValue;
    setAnswers(newAnswers);
  };
  
  const handleFillInBlankChange = (questionIndex: number, text: string) => {
    const newFillInAnswers = { ...fillInAnswers };
    newFillInAnswers[questionIndex] = text;
    setFillInAnswers(newFillInAnswers);
    
    const newAnswers = [...answers];
    newAnswers[questionIndex] = text;
    setAnswers(newAnswers);
  };
  
  const handleNextQuestion = () => {
    if (!test) return;
    if (currentQuestionIndex < test.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };
  
  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };
  
  const handleSubmit = async () => {
    if (!test) return;
    
    // Check if all questions are answered
    const unanswered = answers.findIndex((answer, index) => {
      const q = test.questions[index];
      if (q.type === 'multiple_choice' && answer === -1) return true;
      if (q.type === 'fill_in_the_blank' && (!answer || String(answer).trim() === '')) return true;
      if (q.type === 'true_or_false' && answer === null) return true;
      return false;
    });
    
    if (unanswered !== -1) {
      Alert.alert(
        'Incomplete Exam',
        `You have not answered question ${unanswered + 1}. Do you want to submit anyway?`,
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
    if (!test) return;
    
    try {
      setIsSubmitting(true);
      
      const response = await authenticatedFetch(
        'api/submit-speaking-test',
        {
          method: 'POST',
          body: JSON.stringify({
            answers,
            subject,
            examType,
            timeElapsed
          }),
        },
        navigation
      );
      
      if (!response.ok) {
        throw new Error('Failed to submit exam');
      }
      
      const result = await response.json();
      navigation.navigate('SingleExamResults', {
        score: result.score,
        exam: result.exam,
        userAnswers: answers,
        transcript: test.text,
        timeElapsed
      });
      
    } catch (error) {
      console.error('Error submitting speaking exam:', error);
      Alert.alert('Error', 'Failed to submit your exam. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Count answered questions
  const getAnsweredCount = () => {
    if (!test) return 0;
    return answers.filter((answer, index) => {
      const q = test.questions[index];
      if (q.type === 'multiple_choice') return answer !== -1;
      if (q.type === 'fill_in_the_blank') return answer && String(answer).trim() !== '';
      if (q.type === 'true_or_false') return answer !== null;
      return false;
    }).length;
  };
  
  const renderQuestion = () => {
    if (!test) return null;
    
    const question = test.questions[currentQuestionIndex];
    
    switch (question.type) {
      case 'multiple_choice':
        return (
          <>
            <Text style={styles.questionText}>{question.question}</Text>
            {question.options?.map((option, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.optionButton,
                  answers[currentQuestionIndex] === idx ? styles.selectedOption : null
                ]}
                onPress={() => handleSelectAnswer(currentQuestionIndex, idx)}
              >
                <Text style={styles.optionLetter}>{String.fromCharCode(65 + idx)}</Text>
                <Text style={styles.optionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </>
        );
        
      case 'fill_in_the_blank':
        return (
          <>
            <Text style={styles.questionText}>{question.question}</Text>
            <TextInput
              style={styles.fillBlankInput}
              value={fillInAnswers[currentQuestionIndex] || ''}
              onChangeText={(text) => handleFillInBlankChange(currentQuestionIndex, text)}
              placeholder="Type your answer here"
            />
          </>
        );
        
      case 'true_or_false':
        return (
          <>
            <Text style={styles.questionText}>{question.question}</Text>
            <View style={styles.truefalseContainer}>
              <TouchableOpacity
                style={[
                  styles.trueFalseButton,
                  answers[currentQuestionIndex] === true ? styles.selectedOption : null
                ]}
                onPress={() => handleSelectAnswer(currentQuestionIndex, true)}
              >
                <Text style={styles.trueFalseText}>True</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.trueFalseButton,
                  answers[currentQuestionIndex] === false ? styles.selectedOption : null
                ]}
                onPress={() => handleSelectAnswer(currentQuestionIndex, false)}
              >
                <Text style={styles.trueFalseText}>False</Text>
              </TouchableOpacity>
            </View>
          </>
        );
        
      default:
        return <Text>Unknown question type</Text>;
    }
  };
  
  // Navigation buttons at the bottom
  const renderQuestionNav = () => {
    if (!test) return null;
    
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.questionNavContainer}>
        {test.questions.map((_, index) => {
          const isAnswered = answers[index] !== -1 && answers[index] !== '' && answers[index] !== null;
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.questionNumButton,
                isAnswered ? styles.answeredQuestionButton : styles.unansweredQuestionButton,
                currentQuestionIndex === index ? styles.currentQuestionButton : null
              ]}
              onPress={() => setCurrentQuestionIndex(index)}
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
          );
        })}
      </ScrollView>
    );
  };
  
  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading speaking test...</Text>
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
  
  if (!test) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Failed to load test data</Text>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.navButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Listening Exam: {subject}</Text>
        <Text style={styles.timer}>Time: {formatTime(timeElapsed)}</Text>
      </View>
      
      <View style={styles.audioSection}>
        <audio 
          ref={audioRef}
          src={`${HOST}${test.audio}` || ''}
          controls={false}
          onEnded={() => console.log('Audio ended')}
        />
        <TouchableOpacity
          style={[styles.playButton, playCount >= 3 && styles.disabledButton]}
          onPress={handlePlayAudio}
          disabled={playCount >= 3}
        >
          <Text style={styles.playButtonText}>
            {playCount >= 3 ? 'Limit Reached' : `Play Audio (${playCount}/3)`}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.progressInfo}>
        <Text style={styles.progressText}>
          Question {currentQuestionIndex + 1} of {test.questions.length}
        </Text>
        <Text style={styles.progressText}>
          Answered: {getAnsweredCount()}/{test.questions.length}
        </Text>
      </View>
      
      {renderQuestionNav()}
      
      <View style={styles.questionContainer}>
        {renderQuestion()}
      </View>
      
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[styles.navButton, currentQuestionIndex === 0 ? styles.disabledButton : null]}
          onPress={handlePrevQuestion}
          disabled={currentQuestionIndex === 0}
        >
          <Text style={styles.navButtonText}>Previous</Text>
        </TouchableOpacity>
        
        {currentQuestionIndex === test.questions.length - 1 ? (
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
    fontSize: 20,
    fontWeight: 'bold',
  },
  timer: {
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  audioSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  playButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 10,
  },
  playButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  questionNavContainer: {
    flexDirection: 'row',
    marginVertical: 10,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
  },
  optionLetter: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
  optionText: {
    fontSize: 16,
    flex: 1,
  },
  selectedOption: {
    backgroundColor: '#bbdefb',
    borderColor: '#1976d2',
    borderWidth: 1,
  },
  fillBlankInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  truefalseContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  trueFalseButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 5,
    width: '45%',
    alignItems: 'center',
  },
  trueFalseText: {
    fontSize: 16,
    fontWeight: 'bold',
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
});