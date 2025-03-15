import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  BackHandler,
  AppState
} from 'react-native';
import { Audio } from 'expo-av';
import { authenticatedFetch } from '../../utils/api';
import { HOST } from '../../constants/server';
import * as FileSystem from 'expo-file-system';
import EvaluationResult from './EvaluationResult';

interface SpeakingItem {
  audio: string;
  phonemes: string;
  text: string;
}

interface SpeakingExercise {
  difficulty: number;
  items: SpeakingItem[];
  session_id: string;
  subject: string;
}

interface SpeakingExerciseTestProps {
  navigation: any;
  route: any;
}

interface WordAnalysis {
  expected_word: string;
  result_word: string;
  expected_phonemes: string;
  result_phonemes: string;
  pronunciation_score: number;
  errors: string[];
  error_details: Array<{ type: string; expected: string; result?: string }>;
  correct_phonemes: boolean[];
}

interface SpeechEvaluation {
  accuracy_score: number;
  word_level_analysis: WordAnalysis[];
  overall_errors: {
    substitution: number;
    insertion: number;
    deletion: number;
  };
  result_text: string; // Fixed typo from API response
  resutl_text: string; // Include the misspelled version for compatibility
  result_phonemes: string;
  expected_text: string;
  expected_phonemes: string;
  message: string;
}

interface RecordingAttempt {
  completed: boolean;
  evaluation?: SpeechEvaluation;
  item_index?: number;
}

export default function SpeakingExerciseTest({ navigation, route }: SpeakingExerciseTestProps) {
  const { subject, difficulty } = route.params;
  const [exercise, setExercise] = useState<SpeakingExercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [attempts, setAttempts] = useState<RecordingAttempt[][]>([]);
  const [currentAttemptIndex, setCurrentAttemptIndex] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Audio playback states
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Recording states
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch exercise
  useEffect(() => {
    const fetchExercise = async () => {
      try {
        setLoading(true);
        const response = await authenticatedFetch(
          `api/create-speaking-exercise?subject=${encodeURIComponent(subject)}&difficulty=${difficulty}`,
          { method: 'GET' },
          navigation
        );

        if (!response.ok) {
          throw new Error('Failed to fetch speaking exercise');
        }

        const data: SpeakingExercise = await response.json();
        setExercise(data);

        // Initialize attempts array (3 attempts per question, all initially incomplete)
        const initialAttempts = data.items.map(() =>
          Array(3).fill({ completed: false })
        );
        setAttempts(initialAttempts);

      } catch (error) {
        console.error('Error fetching speaking exercise:', error);
        setError('Failed to load speaking exercise. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchExercise();
  }, [subject, difficulty]);

  // Audio permission
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'You need to grant audio recording permissions to use this feature.');
        }

        // Set audio mode for recording
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.error('Error requesting permissions:', error);
        Alert.alert('Error', 'Failed to set up audio recording');
      }
    })();

    // Cleanup
    return () => {
      if (timerInterval) clearInterval(timerInterval);
      if (sound) sound.unloadAsync();
    };
  }, []);

  // Time tracking
  useEffect(() => {
    if (loading || !exercise) return;

    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, exercise]);

  // Setup back button warning
  useEffect(() => {
    const backAction = () => {
      Alert.alert(
        'Exit Exercise',
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
          'Exit Exercise',
          'Are you sure you want to exit? Your progress will be lost.'
        );
      }
    });

    return () => subscription.remove();
  }, []);

  // Improved audio setup for better reliability
  useEffect(() => {
    if (!exercise || loading) return;

    const loadAudio = async () => {
      try {
        // Unload any existing audio first to prevent memory leaks
        if (sound) {
          await sound.unloadAsync();
          setSound(null);
        }

        setIsAudioLoaded(false);
        const currentAudioPath = exercise.items[currentItemIndex].audio;
        console.log('Loading audio from:', `${HOST}${currentAudioPath}`);

        // Make sure mode is set correctly before creating the sound
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          allowsRecordingIOS: true,
        });

        // Set up audio playback with error handling
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: `${HOST}${currentAudioPath}` },
          { shouldPlay: false },
          onPlaybackStatusUpdate
        );

        console.log('Audio loaded successfully');
        setSound(newSound);
        setIsAudioLoaded(true);
      } catch (error) {
        console.error('Error loading audio:', error);
        setIsAudioLoaded(false);
        Alert.alert(
          'Audio Error',
          'Could not load audio file. Please try again.',
          [{ text: 'OK' }]
        );
      }
    };

    loadAudio();

    // Cleanup function
    return () => {
      if (sound) {
        console.log('Unloading sound in cleanup');
        sound.unloadAsync();
      }
    };
  }, [exercise, currentItemIndex]);

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);

      // Handle playback completion
      if (status.didJustFinish) {
        setIsPlaying(false);
      }
    } else if (status.error) {
      console.error(`Playback error: ${status.error}`);
      setIsPlaying(false);
    }
  };

  const handlePlayAudio = async () => {
    if (!sound) {
      Alert.alert('Audio not ready', 'The audio is still loading, please wait.');
      return;
    }

    try {
      // Always reset to beginning before playing
      await sound.stopAsync();
      await sound.setPositionAsync(0);
      await sound.playAsync();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Playback Error', 'Failed to play audio. Please try again.');
      setIsPlaying(false);
    }
  };

  // Enhanced attempt limitation
  const startRecording = async () => {
    if (!exercise) return;

    // Check if we've reached the maximum attempts for this question
    if (currentAttemptIndex >= 3) {
      Alert.alert('Maximum attempts reached', 'You can only record 3 attempts per question.');
      return;
    }

    // Check if this attempt already exists and is completed
    const existingAttempt = attempts[currentItemIndex][currentAttemptIndex];
    if (existingAttempt && existingAttempt.completed) {
      Alert.alert(
        'Attempt already completed',
        'This attempt was already successful. Moving to the next question.',
        [{ text: 'OK', onPress: () => handleNextQuestion() }]
      );
      return;
    }

    try {
      // Make sure audio mode is set for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create new recording object with specific WAV format settings
      const { recording } = await Audio.Recording.createAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/wav',
          bitsPerSecond: 128000,
        },
      });

      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration timer
      const interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      setTimerInterval(interval);

    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Recording Error', 'Failed to start recording. Please check your microphone permissions.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      // Stop recording
      await recording.stopAndUnloadAsync();
      setIsRecording(false);

      // Stop timer
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }

      // Get recorded URI
      const uri = recording.getURI();
      if (!uri) {
        throw new Error('No recording URI available');
      }

      // Process the recording
      await processRecording(uri);

      // Reset recording state
      setRecording(null);

    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
      setIsRecording(false);
      setRecording(null);
    }
  };

  const processRecording = async (uri: string) => {
    if (!exercise) return;

    try {
      setIsProcessing(true);

      // Get expected text for current question
      const expectedText = exercise.items[currentItemIndex].text;

      // Create form data for API request
      const formData = new FormData();

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('Recording file not found');
      }

      // Append audio file to form data
      formData.append('audio', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        type: 'audio/wav',
        name: 'speech.wav',
      } as any);

      // Add expected text for comparison
      formData.append('session_id', exercise.session_id);
      formData.append('item_index', currentItemIndex.toString());
      formData.append('expected_text', expectedText);

      // Send request to API
      const response = await authenticatedFetch(
        'api/check-speaking-recording',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          body: formData,
        },
        navigation
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      // Parse response
      const result = await response.json();
      console.log('Recording result:', result);

      // Update attempts for current question with the evaluation data
      const newAttempts = [...attempts];
      newAttempts[currentItemIndex][currentAttemptIndex] = {
        completed: result.evaluation.accuracy_score > 0.7,
        evaluation: result.evaluation,
        item_index: result.item_index
      };

      setAttempts(newAttempts);

      // If accuracy score is above threshold, mark as completed
      // Get overall assessment based on accuracy score
      let overallAssessment = 'Poor';
      if (result.evaluation.accuracy_score > 0.9) {
        overallAssessment = 'Excellent';
      } else if (result.evaluation.accuracy_score > 0.8) {
        overallAssessment = 'Good';
      } else if (result.evaluation.accuracy_score > 0.7) {
        overallAssessment = 'Fair';
      }

      if (result.evaluation.accuracy_score > 0.7) {
        Alert.alert('Good job!', `Your pronunciation was rated as ${overallAssessment}. Moving to the next question.`);
        handleNextQuestion();
      } else {
        // Otherwise, move to next attempt
        if (currentAttemptIndex < 2) {
          setCurrentAttemptIndex(currentAttemptIndex + 1);
          Alert.alert('Try again', `Your pronunciation was rated as ${overallAssessment}. You have ${2 - currentAttemptIndex} attempts left.`);
        } else {
          Alert.alert('Maximum attempts reached', 'Moving to the next question.');
          handleNextQuestion();
        }
      }

    } catch (error) {
      console.error('Error processing recording:', error);
      Alert.alert('Error', 'Failed to process speech recording');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrevQuestion = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
      setCurrentAttemptIndex(0);
    }
  };

  const handleNextQuestion = () => {
    if (!exercise) return;

    if (currentItemIndex < exercise.items.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
      setCurrentAttemptIndex(0);
    }
  };

  const handleSubmit = async () => {
    if (!exercise) return;

    // Check if all questions have at least one completed attempt
    const incompleteQuestions = attempts.findIndex(questionAttempts =>
      !questionAttempts.some(attempt => attempt.completed)
    );

    if (incompleteQuestions !== -1) {
      Alert.alert(
        'Incomplete Exercise',
        `You have not completed question ${incompleteQuestions + 1}. Do you want to submit anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit', onPress: submitExercise }
        ]
      );
    } else {
      submitExercise();
    }
  };

  const submitExercise = async () => {
    if (!exercise) return;

    try {
      setIsSubmitting(true);

      const response = await authenticatedFetch(
        'api/submit-speaking-exercise',
        {
          method: 'POST',
          body: JSON.stringify({
            session_id: exercise.session_id,
            subject,
            difficulty,
            timeElapsed
          }),
        },
        navigation
      );

      if (!response.ok) {
        throw new Error('Failed to submit exercise');
      }

      const result = await response.json();

      // Navigate to results page with the data
      navigation.reset({
        index: 0,
        routes: [
          { name: 'Main' },
          {
            name: 'SpeakingExamResults',
            params: {
              message: result.message,
              exam_id: result.exam_id,
              overall_score: result.overall_score,
              attempts,
              exercise,
              timeElapsed
            }
          }
        ],
      });

    } catch (error) {
      console.error('Error submitting speaking exercise:', error);
      Alert.alert('Error', 'Failed to submit your exercise. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getAttemptsCompleted = () => {
    return attempts.filter(questionAttempts =>
      questionAttempts.some(attempt => attempt.completed)
    ).length;
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading speaking exercise...</Text>
      </View>
    );
  }

  // Error state
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

  // No exercise data
  if (!exercise) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Failed to load exercise data</Text>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.navButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentItem = exercise.items[currentItemIndex];
  currentItem.phonemes = currentItem.phonemes.replaceAll(' ', '').replace(/\/|_/g, ' ');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Speaking Exercise: {subject}</Text>
        <Text style={styles.timer}>Time: {formatTime(timeElapsed)}</Text>
      </View>

      <ScrollView style={styles.contentContainer}>
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            Question {currentItemIndex + 1} of {exercise.items.length}
          </Text>
          <Text style={styles.progressText}>
            Completed: {getAttemptsCompleted()}/{exercise.items.length}
          </Text>
        </View>

        {/* Question Navigation */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.questionNavContainer}>
          {exercise.items.map((_, index) => {
            const isCompleted = attempts[index]?.some(attempt => attempt.completed);
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.questionNumButton,
                  isCompleted ? styles.completedQuestionButton : styles.incompleteQuestionButton,
                  currentItemIndex === index ? styles.currentQuestionButton : null
                ]}
                onPress={() => {
                  setCurrentItemIndex(index);
                  setCurrentAttemptIndex(0);
                }}
              >
                <Text
                  style={[
                    styles.questionNumText,
                    currentItemIndex === index ? styles.currentQuestionText : null
                  ]}
                >
                  {index + 1}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Question Display */}
        <View style={styles.questionContainer}>
          <Text style={styles.questionPrompt}>Listen and repeat the following sentence:</Text>

          <View style={styles.textDisplay}>
            <View style={styles.sentenceRow}>
              <TouchableOpacity
                style={styles.playButtonIcon}
                onPress={handlePlayAudio}
                disabled={!isAudioLoaded}
              >
                <Text style={styles.playIcon}>{isPlaying ? '🔊' : '▶️'}</Text>
              </TouchableOpacity>
              <Text style={styles.sentenceText}>{currentItem.text}</Text>
            </View>

            <View style={styles.phoneticContainer}>
              <Text style={styles.phoneticLabel}>Phonetic:</Text>
              <Text style={styles.phoneticText}>/{currentItem.phonemes}/</Text>
            </View>
          </View>

          {/* Compact Recording Section */}
          <View style={styles.compactRecordingSection}>
            {isRecording ? (
              <View style={styles.recordingStatus}>
                <View style={styles.recordingIndicator}>
                  <View style={[styles.recordingDot, styles.pulsatingDot]} />
                </View>
                <Text style={styles.recordingText}>Recording: {formatDuration(recordingDuration)}</Text>

                <TouchableOpacity
                  style={styles.stopRecordingButton}
                  onPress={stopRecording}
                >
                  <Text style={styles.stopIcon}>⏹️</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.recordingControls}>
                <View style={styles.attemptsStatusContainer}>
                  <View style={styles.attemptsIndicator}>
                    {[0, 1, 2].map(idx => {
                      const attemptStatus = attempts[currentItemIndex]?.[idx];
                      return (
                        <View
                          key={idx}
                          style={[
                            styles.attemptDot,
                            currentAttemptIndex === idx && styles.currentAttemptDot,
                            attemptStatus?.completed && styles.completedAttemptDot,
                            attemptStatus?.evaluation && !attemptStatus.completed && styles.failedAttemptDot
                          ]}
                        />
                      );
                    })}
                  </View>
                  <Text style={styles.attemptsLeftText}>
                    {currentAttemptIndex >= 3 ?
                      "No attempts left" :
                      `${3 - currentAttemptIndex} ${3 - currentAttemptIndex === 1 ? 'attempt' : 'attempts'} left`
                    }
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.recordButtonIcon,
                    (isProcessing || currentAttemptIndex >= 3) && styles.disabledButton
                  ]}
                  onPress={startRecording}
                  disabled={isProcessing || currentAttemptIndex >= 3}
                >
                  <Text style={styles.micIcon}>🎙️</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Processing Indicator */}
          {isProcessing && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.processingText}>Processing audio...</Text>
            </View>
          )}

          {/* Compact Attempts Display */}
          {attempts[currentItemIndex]?.some(attempt => attempt.evaluation) && (
            <View style={styles.compactAttemptsContainer}>
              <Text style={styles.attemptsTitle}>Your Attempts:</Text>

              {/* Display attempts in reverse order (newest first) */}
              {attempts[currentItemIndex]
                .slice()
                .reverse()
                .map((attempt, idx) =>
                  attempt.evaluation ? (
                    <EvaluationResult
                      key={idx}
                      attempt={attempt}
                      attemptNumber={attempts[currentItemIndex].length - idx}
                    />
                  ) : null
                )
              }
            </View>
          )}
        </View>
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[styles.navButton, currentItemIndex === 0 ? styles.disabledButton : null]}
          onPress={handlePrevQuestion}
          disabled={currentItemIndex === 0}
        >
          <Text style={styles.navButtonText}>Previous</Text>
        </TouchableOpacity>

        {currentItemIndex === exercise.items.length - 1 ? (
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
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
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
  contentContainer: {
    flex: 1,
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
  incompleteQuestionButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cccccc',
  },
  completedQuestionButton: {
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
  questionPrompt: {
    fontSize: 16,
    marginBottom: 15,
    color: '#666',
  },
  textDisplay: {
    backgroundColor: '#f7f9fc',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  sentenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  playButtonIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  playIcon: {
    fontSize: 24,
  },
  sentenceText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  phoneticContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  phoneticLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 5,
  },
  phoneticText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#2196F3',
  },
  audioSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  playButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  playButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  recordingSection: {
    alignItems: 'center',
    marginVertical: 20,
    borderTopWidth: 1,
    paddingTop: 20,
    borderTopColor: '#eee',
  },
  instructions: {
    textAlign: 'center',
    marginBottom: 15,
    color: '#666',
    fontSize: 16,
  },
  recordingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  recordingIndicator: {
    marginRight: 10,
  },
  recordingDot: {
    width: 12,
    height: 12,
    backgroundColor: '#f44336',
    borderRadius: 6,
    opacity: 1,
  },
  recordingText: {
    fontSize: 16,
    color: '#f44336',
    fontWeight: '500',
  },
  recordButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 50,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  processingContainer: {
    alignItems: 'center',
    marginVertical: 15,
  },
  processingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  attemptsContainer: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  attemptsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  attemptItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  completedAttempt: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  failedAttempt: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#f44336',
  },
  attemptNumber: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  recognizedText: {
    fontSize: 16,
    marginBottom: 5,
  },
  confidenceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confidenceText: {
    fontSize: 14,
    color: '#666',
  },
  passedText: {
    color: '#4CAF50',
  },
  failedText: {
    color: '#f44336',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 50,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
  },
  navButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
  },
  assessmentText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  poorText: {
    color: '#f44336', // Red
  },
  fairText: {
    color: '#FF9800', // Orange
  },
  goodText: {
    color: '#4CAF50', // Green
  },
  excellentText: {
    color: '#2196F3', // Blue
  },
  wordResultsContainer: {
    marginTop: 10,
    backgroundColor: 'rgba(0,0,0,0.03)',
    padding: 10,
    borderRadius: 5,
  },
  wordResultsTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  wordResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderRadius: 3,
    marginVertical: 2,
  },
  wordText: {
    fontSize: 14,
  },
  correctWord: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  mispronuncedWord: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  mispronunciationWarning: {
    fontSize: 12,
    color: '#f44336',
  },
  attemptsStatusContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  attemptsIndicator: {
    flexDirection: 'row',
    marginVertical: 10,
  },
  attemptDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  currentAttemptDot: {
    borderColor: '#2196F3',
    borderWidth: 2,
  },
  completedAttemptDot: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  failedAttemptDot: {
    backgroundColor: '#f44336',
    borderColor: '#f44336',
  },
  attemptsLeftText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  compactRecordingSection: {
    alignItems: 'center',
    marginVertical: 10,
    borderTopWidth: 1,
    paddingTop: 15,
    borderTopColor: '#eee',
  },
  recordingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  recordButtonIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  micIcon: {
    fontSize: 30,
  },
  pulsatingDot: {
    opacity: 1,
  },
  stopRecordingButton: {
    marginLeft: 15,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopIcon: {
    fontSize: 22,
    color: 'white',
  },
  compactAttemptsContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
});