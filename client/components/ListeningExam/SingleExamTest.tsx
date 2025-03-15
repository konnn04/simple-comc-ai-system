import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  BackHandler,
  ActivityIndicator,
  AppState,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { authenticatedFetch } from '../../utils/api';
import { HOST } from '../../constants/server';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

interface Question {
  question: string;
  type: string;
  options?: string[];
  correct_answer: string | boolean;
  explanation: string;
}

interface ListeningTest {
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

let playCount_ = 0;
const { width } = Dimensions.get('window');

export default function SingleExamTest({ navigation, route }: SingleExamTestProps) {
  const { subject, examType } = route.params;
  const [test, setTest] = useState<ListeningTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<(string | boolean | number)[]>([]);
  const [fillInAnswers, setFillInAnswers] = useState<{ [key: number]: string }>({});
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playCount, setPlayCount] = useState(0);

  const scrollViewRef = useRef<ScrollView>(null);
  const questionsScrollViewRef = useRef<ScrollView>(null);

  // Fetch test data
  useEffect(() => {
    const fetchTest = async () => {
      try {
        setLoading(true);
        const response = await authenticatedFetch(
          `api/get-ai-listening-test?subject=${encodeURIComponent(subject)}&type=${examType}`,
          { method: 'GET' },
          navigation
        );

        if (!response.ok) {
          throw new Error('Failed to fetch listening test');
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
        console.error('Error fetching listening test:', error);
        setError('Failed to load listening test. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
  }, [subject, examType]);

  // Setup audio event listeners
  useEffect(() => {
    // Load audio when component mounts
    if (!test || loading) return;

    const loadAudio = async () => {
      try {
        // Unload any existing audio
        if (sound) {
          await sound.unloadAsync();
        }

        // Set up audio playback
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: `${HOST}${test.audio}` },
          { shouldPlay: false },
          onPlaybackStatusUpdate
        );

        setSound(newSound);
        setIsAudioLoaded(true);
        console.log('Audio loaded successfully');
      } catch (error) {
        console.error('Error loading audio:', error);
        Alert.alert('Error', 'Failed to load audio file');
      }
    };

    loadAudio();

    // Cleanup function
    return () => {
      if (sound) {
        console.log('Unloading sound in cleanup');
        sound.stopAsync().then(() => {
          sound.unloadAsync();
        }).catch(error => {
          console.error('Error cleaning up audio:', error);
        });
      }
    };
  }, [test]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (sound) {
        sound.stopAsync().catch(error => {
          console.error('Error stopping audio during navigation:', error);
        });
      }
    });

    return unsubscribe;
  }, [navigation, sound]);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setCurrentTime(status.positionMillis / 1000);
      setDuration((status.durationMillis || 0) / 1000);
      setIsPlaying(status.isPlaying);

      // Handle playback completion
      if (status.didJustFinish) {
        setIsPlaying(false);
        setCurrentTime(0);
        console.log('Audio ended');
      }
    }
  };

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

  const handlePlayAudio = async () => {
    if (!sound || !isAudioLoaded) return;

    try {
      if (isPlaying) {
        // Pause the audio
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        // Check if we're starting from the beginning (increment play count)
        if (currentTime === 0 && playCount >= 3) {
          Alert.alert('Limit Reached', 'You can only play the audio 3 times');
          return;
        }

        // If starting from beginning, increment play count
        if (currentTime === 0) {
          setPlayCount(prev => {
            playCount_ = prev + 1;
            return prev + 1;
          });
        }

        // Play the audio
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const handleRestartAudio = async () => {
    if (!sound || !isAudioLoaded) return;

    try {
      if (playCount >= 3) {
        Alert.alert('Limit Reached', 'You can only play the audio 3 times');
        return;
      }

      // Reset current time to beginning
      await sound.setPositionAsync(0);
      setCurrentTime(0);

      // Increment play count and start playing
      setPlayCount(prev => {
        playCount_ = prev + 1;
        return prev + 1;
      });

      await sound.playAsync();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error restarting audio:', error);
      Alert.alert('Error', 'Failed to restart audio');
    }
  };

  const formatAudioTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        'api/submit-listening-test',
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
      // navigation.navigate('SingleExamResults', {
      //   score: result.score,
      //   results: result.result,
      //   transcript: result.text,
      //   questions: test.questions,
      //   subject,
      //   timeElapsed
      // });
      //Pause audio
      if (sound) {
        await sound.pauseAsync();
      }
      navigation.reset({
        index: 0,
        routes: [
          { name: 'Main' },
          {
            name: 'SingleExamResults',
            params: {
              score: result.score,
              results: result.result,
              transcript: result.text,
              questions: test.questions,
              subject,
              timeElapsed
            }
          }
        ],
      });

    } catch (error) {
      console.error('Error submitting listening exam:', error);
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
            <Text style={styles.questionText}>{currentQuestionIndex + 1}. {question.question}</Text>
            {question.options?.map((option, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.optionButton,
                  answers[currentQuestionIndex] === idx ? styles.selectedOption : null
                ]}
                onPress={() => handleSelectAnswer(currentQuestionIndex, idx)}
              >
                <View style={[
                  styles.optionCircle,
                  answers[currentQuestionIndex] === idx ? styles.selectedOptionCircle : null
                ]}>
                  <Text style={[
                    styles.optionLetter,
                    answers[currentQuestionIndex] === idx ? styles.selectedOptionLetter : null
                  ]}>
                    {String.fromCharCode(65 + idx)}
                  </Text>
                </View>
                <Text style={styles.optionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </>
        );

      case 'fill_in_the_blank':
        return (
          <>
            <Text style={styles.questionText}>{currentQuestionIndex + 1}. {question.question}</Text>
            <TextInput
              style={styles.fillBlankInput}
              value={fillInAnswers[currentQuestionIndex] || ''}
              onChangeText={(text) => handleFillInBlankChange(currentQuestionIndex, text)}
              placeholder="Type your answer here"
              placeholderTextColor="#888"
            />
          </>
        );

      case 'true_or_false':
        return (
          <>
            <Text style={styles.questionText}>{currentQuestionIndex + 1}. {question.question}</Text>
            <View style={styles.truefalseContainer}>
              <TouchableOpacity
                style={[
                  styles.trueFalseButton,
                  answers[currentQuestionIndex] === true ? styles.selectedTrueFalse : null
                ]}
                onPress={() => handleSelectAnswer(currentQuestionIndex, true)}
              >
                <Ionicons
                  name={answers[currentQuestionIndex] === true ? "checkmark-circle" : "checkmark-circle-outline"}
                  size={24}
                  color={answers[currentQuestionIndex] === true ? "white" : "#666"}
                />
                <Text style={[
                  styles.trueFalseText,
                  answers[currentQuestionIndex] === true ? styles.selectedTrueFalseText : null
                ]}>True</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.trueFalseButton,
                  answers[currentQuestionIndex] === false ? styles.selectedTrueFalse : null
                ]}
                onPress={() => handleSelectAnswer(currentQuestionIndex, false)}
              >
                <Ionicons
                  name={answers[currentQuestionIndex] === false ? "close-circle" : "close-circle-outline"}
                  size={24}
                  color={answers[currentQuestionIndex] === false ? "white" : "#666"}
                />
                <Text style={[
                  styles.trueFalseText,
                  answers[currentQuestionIndex] === false ? styles.selectedTrueFalseText : null
                ]}>False</Text>
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
      <ScrollView 
        ref={questionsScrollViewRef}
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.questionNavContainer}
        contentContainerStyle={styles.questionNavContent}
      >
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
              onPress={() => {
                setCurrentQuestionIndex(index);
                // Scroll to center the selected question
                questionsScrollViewRef.current?.scrollTo({ 
                  x: index * 50 - width/2 + 25, 
                  animated: true 
                });
              }}
            >
              <Text
                style={[
                  styles.questionNumText,
                  currentQuestionIndex === index ? styles.currentQuestionText : null,
                  isAnswered ? styles.answeredQuestionText : null
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
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#3F51B5" />
        <Text style={styles.loadingText}>Loading listening test...</Text>
      </View>
    );
  }

  if (error || !test) {
    return (
      <View style={styles.loaderContainer}>
        <Ionicons name="alert-circle" size={60} color="#f44336" />
        <Text style={styles.errorText}>{error || "Failed to load test data"}</Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.errorButtonText}>Go Back</Text>
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
        <View style={styles.audioPlayerContainer}>
          {/* Add top navigation controls */}
          <View style={styles.topNavContainer}>
            <TouchableOpacity
              style={[styles.navIconButton, currentQuestionIndex === 0 ? styles.disabledButton : null]}
              onPress={handlePrevQuestion}
              disabled={currentQuestionIndex === 0}
            >
              <Ionicons name="chevron-back" size={28} color={currentQuestionIndex === 0 ? "#cccccc" : "#2196F3"} />
            </TouchableOpacity>

            <Text style={styles.questionIndicator}>
              Question {currentQuestionIndex + 1} of {test.questions.length}
            </Text>

            <TouchableOpacity
              style={[styles.navIconButton, currentQuestionIndex === test.questions.length - 1 ? styles.disabledButton : null]}
              onPress={handleNextQuestion}
              disabled={currentQuestionIndex === test.questions.length - 1}
            >
              <Ionicons name="chevron-forward" size={28} color={currentQuestionIndex === test.questions.length - 1 ? "#cccccc" : "#2196F3"} />
            </TouchableOpacity>
          </View>

          {/* Audio Player Controls */}
          <View style={styles.playerControls}>
            <TouchableOpacity
              style={styles.audioControlButton}
              onPress={handlePlayAudio}
            >
              <Ionicons
                name={isPlaying ? "pause-circle" : "play-circle"}
                size={50}
                color="#2196F3"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.audioRestartButton}
              onPress={handleRestartAudio}
            >
              <MaterialIcons name="replay" size={30} color="#2196F3" />
            </TouchableOpacity>
          </View>

          {/* Audio Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${(currentTime / duration) * 100 || 0}%` }
                ]}
              />
            </View>

            {/* Time display */}
            <View style={styles.timeDisplay}>
              <Text style={styles.timeText}>
                {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
              </Text>
              <Text style={[styles.playsRemaining, playCount >= 2 && styles.warningText]}>
                {3 - playCount} plays remaining
              </Text>
            </View>
          </View>
        </View>
      </View>

// Replace the bottom navigation controls with a Submit button when on last question
      <View style={styles.submitContainer}>
        {currentQuestionIndex === test.questions.length - 1 && (
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting...' : 'Submit Exam'}
            </Text>
          </TouchableOpacity>
        )}
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
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
    elevation: 2,
  },
  headerLeft: {
    flex: 1,
  },
  subject: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  examType: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 5,
  },
  audioSection: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  audioTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  audioTitleText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  playWarning: {
    color: '#f44336',
    fontWeight: '700',
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: 15,
  },
  progressBar: {
    width: '100%',
    height: 40,
  },
  timeDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
  },
  audioControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioControlButton: {
    padding: 10,
  },
  playPauseButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3F51B5',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 30,
  },
  disabledButton: {
    opacity: 0.5,
  },
  playCountContainer: {
    padding: 5,
  },
  playCountText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  progressIndicator: {
    paddingHorizontal: 20,
    marginBottom: 5,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  questionNavContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eaeaea',
  },
  questionNavContent: {
    paddingHorizontal: 5,
  },
  questionNumButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  unansweredQuestionButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  answeredQuestionButton: {
    backgroundColor: '#C5CAE9',
    borderWidth: 1,
    borderColor: '#7986CB',
  },
  currentQuestionButton: {
    borderWidth: 2,
    borderColor: '#3F51B5',
  },
  questionNumText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
  },
  currentQuestionText: {
    color: '#3F51B5',
  },
  answeredQuestionText: {
    color: '#3F51B5',
  },
  questionScrollContainer: {
    flex: 1,
    marginBottom: 10,
  },
  questionContentContainer: {
    padding: 15,
  },
  questionContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  questionText: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 24,
    color: '#333',
    marginBottom: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  optionCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedOptionCircle: {
    backgroundColor: '#3F51B5',
  },
  optionLetter: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  selectedOptionLetter: {
    color: 'white',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  selectedOption: {
    backgroundColor: '#EDE7F6',
    borderColor: '#7986CB',
  },
  fillBlankInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  truefalseContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  trueFalseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '47%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedTrueFalse: {
    backgroundColor: '#3F51B5',
    borderColor: '#3F51B5',
  },
  trueFalseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginLeft: 8,
  },
  selectedTrueFalseText: {
    color: 'white',
  },
  navigationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eaeaea',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  prevButton: {
    backgroundColor: '#607D8B',
  },
  nextButton: {
    backgroundColor: '#3F51B5',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
  },
  navButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginHorizontal: 5,
  },
  disabledNavButton: {
    backgroundColor: '#bdbdbd',
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
    marginVertical: 20,
    marginHorizontal: 30,
  },
  errorButton: {
    backgroundColor: '#3F51B5',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 10,
  },
  errorButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  submitContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eaeaea',
    elevation: 2,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  timer: {
    fontSize: 16,
    color: '#666',
  },
  audioPlayerContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  topNavContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  navIconButton: {
    padding: 10,
  },
  questionIndicator: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  playerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  progressBarFill: {
    height: 10,
    backgroundColor: '#3F51B5',
    borderRadius: 5,
  },

  playsRemaining: {
    fontSize: 12,
    color: '#f44336',
    fontWeight: '600',
  },
  warningText: {
    color: '#f44336',
  },
  audioRestartButton: {
    padding: 10,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
  }
});