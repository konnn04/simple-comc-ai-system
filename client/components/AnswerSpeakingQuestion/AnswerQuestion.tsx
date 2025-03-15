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
    Image,
} from 'react-native';
import { Audio } from 'expo-av';
import { authenticatedFetch } from '../../utils/api';
import * as FileSystem from 'expo-file-system';
import { HOST } from '../../constants/server';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

interface Question {
    id?: number;
    difficulty: number;
    question: string;
    topic: string;
}

interface FeedbackSummary {
    overall_score: number;
    strengths: string[];
    improvement_areas: string[];
}

interface CategoryScore {
    score: number;
    comments: string;
    issues?: string[];
}

interface CategoryScores {
    content_relevance: CategoryScore;
    vocabulary: CategoryScore;
    grammar: CategoryScore;
    pronunciation: CategoryScore;
    pace_rhythm: CategoryScore;
    expression: CategoryScore;
}

interface EvaluationResult {
    feedback_text: string;
    audio_path: string;
    feedback_summary: FeedbackSummary;
    category_scores: CategoryScores;
    transcript?: string;
}

interface SpeakingPracticeProps {
    navigation: any;
    route: any;
}

export default function SpeakingPractice({ navigation, route }: SpeakingPracticeProps) {
    const { question } = route.params;

    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<EvaluationResult | null>(null);
    const [feedbackSound, setFeedbackSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Request audio permission and set up audio
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Audio.requestPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission required', 'You need to grant audio recording permissions to use this feature.');
                }

                // Set up audio mode for recording
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

        // Cleanup function - more robust to ensure audio stops properly
        return () => {
            if (timerInterval) clearInterval(timerInterval);
            if (feedbackSound) {
                console.log('Unloading feedback sound on cleanup');
                feedbackSound.stopAsync().then(() => {
                    feedbackSound.unloadAsync();
                }).catch(error => {
                    console.error('Error cleaning up feedback audio:', error);
                });
            }
            if (recording) {
                console.log('Stopping recording on cleanup');
                recording.stopAndUnloadAsync().catch(error => {
                    console.error('Error stopping recording on cleanup:', error);
                });
            }
        };
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', () => {
            console.log('Navigation event: stopping all audio');
            if (feedbackSound) {
                feedbackSound.stopAsync().catch(error => {
                    console.error('Error stopping audio during navigation:', error);
                });
            }
            if (recording) {
                recording.stopAndUnloadAsync().catch(error => {
                    console.error('Error stopping recording during navigation:', error);
                });
            }
            setIsPlaying(false);
        });

        return unsubscribe;
    }, [navigation, feedbackSound, recording]);

    const startRecording = async () => {
        try {
            // Reset previous results
            setResult(null);

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
            Alert.alert('Error', 'Failed to start recording. Please check your microphone permissions.');
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

    const cancelRecording = async () => {
        if (!recording) return;

        try {
            // Stop and discard recording
            await recording.stopAndUnloadAsync();
            setIsRecording(false);

            // Stop timer
            if (timerInterval) {
                clearInterval(timerInterval);
                setTimerInterval(null);
            }

            // Reset recording state
            setRecording(null);
            setRecordingDuration(0);

        } catch (error) {
            console.error('Error canceling recording:', error);
            setIsRecording(false);
            setRecording(null);
        }
    };

    const processRecording = async (uri: string) => {
        try {
            setIsProcessing(true);

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

            // Add question details
            formData.append('question', question.question);
            formData.append('difficulty', question.difficulty.toString());

            // Send request to API
            const response = await authenticatedFetch(
                'api/speaking-practice/evaluate',
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
            const responseData = await response.json();
            console.log('Evaluation result:', responseData);

            // Transform the API response to the expected structure
            const evaluationResult: EvaluationResult = {
                feedback_text: responseData.feedback?.feedback_text || "No feedback available",
                audio_path: responseData.feedback?.audio_path || "",
                feedback_summary: {
                    overall_score: responseData.evaluation?.overall_score || 0,
                    strengths: responseData.evaluation?.strengths || [],
                    improvement_areas: responseData.evaluation?.improvement_areas || []
                },
                category_scores: {
                    content_relevance: responseData.evaluation?.content_relevance || { score: 0, comments: "Not available" },
                    vocabulary: responseData.evaluation?.vocabulary || { score: 0, comments: "Not available" },
                    grammar: responseData.evaluation?.grammar || { score: 0, comments: "Not available" },
                    pronunciation: responseData.evaluation?.pronunciation || { score: 0, comments: "Not available" },
                    pace_rhythm: responseData.evaluation?.pace_rhythm || { score: 0, comments: "Not available" },
                    expression: responseData.evaluation?.expression || { score: 0, comments: "Not available" }
                },
                transcript: responseData.evaluation?.transcript || "No transcript available",
                
            };

            setResult(evaluationResult);

        } catch (error) {
            console.error('Error processing recording:', error);
            Alert.alert('Error', 'Failed to evaluate your speaking. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const playFeedbackAudio = async () => {
        if (!result?.audio_path) return;

        try {
            if (isPlaying && feedbackSound) {
                await feedbackSound.pauseAsync();
                setIsPlaying(false);
                return;
            }

            // If we have a sound object but it's not playing, just play it
            if (feedbackSound) {
                await feedbackSound.playAsync();
                setIsPlaying(true);
                return;
            }

            // Otherwise, create a new sound object
            const audioUrl = `${HOST}${result.audio_path}`;

            const { sound } = await Audio.Sound.createAsync(
                { uri: audioUrl },
                { shouldPlay: true },
                (status) => {
                    if (status.isLoaded && status.didJustFinish) {
                        setIsPlaying(false);
                    }
                }
            );

            setFeedbackSound(sound);
            setIsPlaying(true);
        } catch (error) {
            console.error('Error playing feedback audio:', error);
            Alert.alert('Error', 'Could not play feedback audio');
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getScoreColor = (score: number) => {
        if (score >= 8) return '#4CAF50'; // Green for high scores
        if (score >= 6.5) return '#FF9800'; // Orange for medium scores
        return '#F44336'; // Red for low scores
    };

    const renderDifficultyBadge = () => {
        const difficultyLabels = ['Easy', 'Medium', 'Hard'];
        const backgroundColor = question.difficulty === 0
            ? '#4CAF50'
            : question.difficulty === 1
                ? '#FF9800'
                : '#F44336';

        return (
            <View style={[styles.difficultyBadge, { backgroundColor }]}>
                <Text style={styles.difficultyText}>
                    {difficultyLabels[question.difficulty]}
                </Text>
            </View>
        );
    };

    const renderCategoryScore = (name: string, category: CategoryScore) => (
        <View style={styles.categoryScoreContainer} key={name}>
            <View style={styles.categoryHeader}>
                <Text style={styles.categoryName}>{name}</Text>
                <View style={[
                    styles.scoreBadge,
                    { backgroundColor: getScoreColor(category.score) }
                ]}>
                    <Text style={styles.scoreBadgeText}>{category.score.toFixed(1)}</Text>
                </View>
            </View>
            <Text style={styles.categoryComment}>{category.comments}</Text>

            {category.issues && category.issues.length > 0 && (
                <View style={styles.issueList}>
                    {category.issues.map((issue, index) => (
                        <View key={index} style={styles.issueItem}>
                            <MaterialIcons name="error-outline" size={16} color="#FF9800" />
                            <Text style={styles.issueText}>{issue}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Speaking Practice</Text>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                <View style={styles.questionCard}>
                    <View style={styles.questionHeader}>
                        <Text style={styles.topicText}>{question.topic}</Text>
                        {renderDifficultyBadge()}
                    </View>
                    <Text style={styles.questionText}>{question.question}</Text>
                </View>

                {/* Recording UI */}
                {!result && (
                    <View style={styles.recordingSection}>
                        {isRecording ? (
                            <View style={styles.recordingStatus}>
                                <View style={styles.recordingIndicator}>
                                    <View style={styles.recordingDot} />
                                </View>
                                <Text style={styles.recordingText}>Recording: {formatDuration(recordingDuration)}</Text>
                            </View>
                        ) : (
                            <Text style={styles.instructions}>
                                Press the button below to start recording your answer
                            </Text>
                        )}

                        <View style={styles.recordingControls}>
                            {isRecording ? (
                                <>
                                    <TouchableOpacity
                                        style={styles.recordButton}
                                        onPress={stopRecording}
                                    >
                                        <View style={styles.stopButton}>
                                            <MaterialIcons name="stop" size={32} color="#fff" />
                                        </View>
                                        <Text style={styles.buttonText}>Stop</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.recordButton}
                                        onPress={cancelRecording}
                                    >
                                        <View style={styles.cancelButton}>
                                            <MaterialIcons name="close" size={32} color="#fff" />
                                        </View>
                                        <Text style={styles.buttonText}>Cancel</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.recordButton, isProcessing && styles.disabledButton]}
                                    onPress={startRecording}
                                    disabled={isProcessing}
                                >
                                    <View style={styles.micButton}>
                                        <Ionicons name="mic" size={32} color="#fff" />
                                    </View>
                                    <Text style={styles.buttonText}>
                                        Record Answer
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}

                {/* Processing Indicator */}
                {isProcessing && (
                    <View style={styles.processingContainer}>
                        <ActivityIndicator size="large" color="#2196F3" />
                        <Text style={styles.processingText}>Analyzing your speaking...</Text>
                    </View>
                )}

                {/* Evaluation Results */}
                {result && (
                    <View style={styles.resultSection}>
                        <View style={styles.resultHeader}>
                            <View style={styles.scoreContainer}>
                                <Text style={styles.scoreLabel}>Overall Score</Text>
                                <Text style={[
                                    styles.scoreValue,
                                    { color: getScoreColor(result.feedback_summary.overall_score) }
                                ]}>
                                    {result.feedback_summary.overall_score.toFixed(1)}
                                </Text>
                                <Text style={styles.scoreOutOf}>/10</Text>
                            </View>

                            {/* Audio feedback player */}
                            {result.audio_path && (
                                <TouchableOpacity
                                    style={styles.audioButton}
                                    onPress={playFeedbackAudio}
                                >
                                    <Ionicons
                                        name={isPlaying ? "pause-circle" : "play-circle"}
                                        size={50}
                                        color="#2196F3"
                                    />
                                    <Text style={styles.audioButtonText}>
                                        {isPlaying ? 'Pause' : 'Play'} Feedback
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <View style={styles.fullFeedbackContainer}>
                            <Text style={styles.fullFeedbackTitle}>Your answer</Text>
                            <Text style={styles.fullFeedbackText}>{result.transcript}</Text>
                        </View>
                        {/* Strengths and Areas to Improve */}
                        <View style={styles.feedbackSummaryContainer}>
                            <View style={styles.feedbackColumn}>
                                <View style={styles.feedbackHeader}>
                                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                                    <Text style={styles.feedbackTitle}>Strengths</Text>
                                </View>
                                {result.feedback_summary.strengths.map((item, index) => (
                                    <View key={index} style={styles.feedbackItem}>
                                        <Text style={styles.bulletPoint}>•</Text>
                                        <Text style={styles.feedbackText}>{item}</Text>
                                    </View>
                                ))}
                            </View>

                            <View style={styles.feedbackColumn}>
                                <View style={styles.feedbackHeader}>
                                    <Ionicons name="trending-up" size={20} color="#FF9800" />
                                    <Text style={styles.feedbackTitle}>Areas to Improve</Text>
                                </View>
                                {result.feedback_summary.improvement_areas.map((item, index) => (
                                    <View key={index} style={styles.feedbackItem}>
                                        <Text style={styles.bulletPoint}>•</Text>
                                        <Text style={styles.feedbackText}>{item}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Detailed Category Scores */}
                        <View style={styles.categoriesContainer}>
                            <Text style={styles.categoriesTitle}>Detailed Feedback</Text>

                            {renderCategoryScore('Content Relevance', result.category_scores.content_relevance)}
                            {renderCategoryScore('Vocabulary', result.category_scores.vocabulary)}
                            {renderCategoryScore('Grammar', result.category_scores.grammar)}
                            {renderCategoryScore('Pronunciation', result.category_scores.pronunciation)}
                            {renderCategoryScore('Pace & Rhythm', result.category_scores.pace_rhythm)}
                            {renderCategoryScore('Expression', result.category_scores.expression)}
                        </View>

                        {/* Full Feedback Text */}


                        {/* Try Again Button */}
                        <TouchableOpacity
                            style={styles.tryAgainButton}
                            onPress={() => {
                                setResult(null);
                                if (feedbackSound) {
                                    feedbackSound.unloadAsync();
                                    setFeedbackSound(null);
                                    setIsPlaying(false);
                                }
                            }}
                        >
                            <Ionicons name="refresh" size={20} color="#fff" />
                            <Text style={styles.tryAgainText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
    },
    contentContainer: {
        paddingVertical: 16,
    },
    questionCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 16,
        marginBottom: 20,
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
        marginBottom: 12,
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
        fontSize: 18,
        color: '#333',
        lineHeight: 24,
    },
    recordingSection: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    recordingStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
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
    instructions: {
        textAlign: 'center',
        marginBottom: 20,
        color: '#666',
        fontSize: 16,
    },
    recordingControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
    },
    recordButton: {
        alignItems: 'center',
        marginHorizontal: 10,
    },
    micButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#2196F3',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    stopButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#f44336',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    cancelButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#757575',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    buttonText: {
        color: '#333',
        fontSize: 14,
        fontWeight: '500',
    },
    disabledButton: {
        opacity: 0.5,
    },
    processingContainer: {
        alignItems: 'center',
        marginVertical: 20,
    },
    processingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    resultSection: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    scoreContainer: {
        alignItems: 'center',
    },
    scoreLabel: {
        fontSize: 16,
        color: '#666',
        marginBottom: 4,
    },
    scoreValue: {
        fontSize: 48,
        fontWeight: 'bold',
    },
    scoreOutOf: {
        fontSize: 18,
        color: '#666',
    },
    audioButton: {
        alignItems: 'center',
    },
    audioButtonText: {
        color: '#2196F3',
        marginTop: 4,
        fontSize: 12,
    },
    feedbackSummaryContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 20,
    },
    feedbackColumn: {
        flex: 1,
        paddingHorizontal: 10,
    },
    feedbackHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    feedbackTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 5,
    },
    feedbackItem: {
        flexDirection: 'row',
        marginBottom: 8,
        paddingRight: 5,
    },
    bulletPoint: {
        marginRight: 8,
        fontSize: 16,
    },
    feedbackText: {
        flex: 1,
        fontSize: 14,
        color: '#333',
    },
    categoriesContainer: {
        marginTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 20,
    },
    categoriesTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    categoryScoreContainer: {
        backgroundColor: '#f5f5f5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    categoryName: {
        fontSize: 16,
        fontWeight: '600',
    },
    scoreBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    scoreBadgeText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
    },
    categoryComment: {
        fontSize: 14,
        color: '#333',
        marginBottom: 8,
    },
    issueList: {
        marginTop: 8,
    },
    issueItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    issueText: {
        fontSize: 14,
        color: '#555',
        marginLeft: 6,
    },
    fullFeedbackContainer: {
        marginTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 20,
    },
    fullFeedbackTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    fullFeedbackText: {
        fontSize: 14,
        lineHeight: 22,
        color: '#333',
    },
    tryAgainButton: {
        backgroundColor: '#2196F3',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 30,
        marginTop: 20,
    },
    tryAgainText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8,
    },
});