import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView
} from 'react-native';
import { Audio } from 'expo-av';
import { authenticatedFetch } from '../../utils/api';
import * as FileSystem from 'expo-file-system';

interface SpeechToTextTestProps {
    navigation: any;
}

interface Word {
    word: string;
    start: number;
    end: number;
    phoneme: string;
    conf: number;
}

interface TranscriptionResult {
    text: string;
    words?: Word[];
    phonemes?: string;
}


export default function SpeechToTextTest({ navigation }: SpeechToTextTestProps) {
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    // Update the state type to store the full result object
    const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

    // Request permission to record audio
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
        };
    }, []);

    const startRecording = async () => {
        try {
            // Clear previous transcription
            setTranscriptionResult(null);

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

            // Start duration timer
            const interval = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
            setTimerInterval(interval);

            console.log('Recording started');
        } catch (error) {
            console.error('Error starting recording:', error);
            Alert.alert('Error', 'Failed to start recording');
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

            console.log('Recording stopped');

            // Get recorded URI
            const uri = recording.getURI();
            if (!uri) {
                throw new Error('No recording URI available');
            }

            // Process the recording
            await processRecording(uri);

            // Reset recording state
            setRecording(null);
            setRecordingDuration(0);

        } catch (error) {
            console.error('Error stopping recording:', error);
            Alert.alert('Error', 'Failed to stop recording');
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
                type: 'audio/wav', // Assuming WAV format
                name: 'speech.wav',
            } as any);

            // Send request to API
            const response = await authenticatedFetch(
                'api/stt',
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

            // Parse and display transcription
            const result = await response.json();
            console.log('Transcription result:', result);

            // Store the full result object
            setTranscriptionResult({
                text: result.text || 'No transcription available',
                words: result.words || [],
                phonemes: result.phonemes || ''
            });

        } catch (error) {
            console.error('Error processing recording:', error);
            Alert.alert('Error', 'Failed to process speech to text');
        } finally {
            setIsProcessing(false);
        }
    };

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Speech to Text Test</Text>
            </View>

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
                        Press the button below to start recording your speech
                    </Text>
                )}

                <TouchableOpacity
                    style={[
                        styles.recordButton,
                        isRecording ? styles.stopButton : styles.startButton,
                        (isProcessing) && styles.disabledButton
                    ]}
                    onPress={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing}
                >
                    <Text style={styles.buttonText}>
                        {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </Text>
                </TouchableOpacity>
            </View>

            {isProcessing && (
                <View style={styles.processingContainer}>
                    <ActivityIndicator size="large" color="#2196F3" />
                    <Text style={styles.processingText}>Processing audio...</Text>
                </View>
            )}

{transcriptionResult !== null && !isProcessing && (
    <ScrollView style={styles.resultContainer}>
        <Text style={styles.resultTitle}>Transcription:</Text>
        <View style={styles.transcriptionBox}>
            <Text style={styles.transcriptionText}>{transcriptionResult.text}</Text>
        </View>

        {transcriptionResult.phonemes && (
            <View style={styles.sectionContainer}>
                <Text style={styles.resultTitle}>Phonetic Transcription:</Text>
                <View style={styles.transcriptionBox}>
                    <Text style={styles.phonemesText}>{transcriptionResult.phonemes}</Text>
                </View>
            </View>
        )}

        {transcriptionResult.words && transcriptionResult.words.length > 0 && (
            <View style={styles.sectionContainer}>
                <Text style={styles.resultTitle}>Word-by-Word Analysis:</Text>
                <View style={styles.transcriptionBox}>
                    {transcriptionResult.words.map((word, index) => (
                        <View key={index} style={styles.wordContainer}>
                            <View style={styles.wordHeader}>
                                <Text style={styles.wordText}>{word.word}</Text>
                                <Text style={styles.confidenceText}>
                                    Confidence: {(word.conf * 100).toFixed(0)}%
                                </Text>
                            </View>
                            <View style={styles.wordDetails}>
                                <Text style={styles.phonemeText}>/{word.phoneme}/</Text>
                                <Text style={styles.timeInfo}>
                                    {formatTime(word.start)} - {formatTime(word.end)}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        )}
    </ScrollView>
)}
        </View>
    );
}

const formatTime = (seconds: number): string => {
    return seconds.toFixed(2) + 's';
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    header: {
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    recordingSection: {
        alignItems: 'center',
        marginVertical: 30,
    },
    instructions: {
        textAlign: 'center',
        marginBottom: 20,
        color: '#666',
        fontSize: 16,
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
        // Add blinking animation
        opacity: 1,
        // This would ideally have an animation, but we'd need to use Animated API
    },
    recordingText: {
        fontSize: 16,
        color: '#f44336',
        fontWeight: '500',
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
    resultTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    transcriptionBox: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    transcriptionText: {
        fontSize: 16,
        lineHeight: 24,
    },
    resultContainer: {
        flex: 1,
        marginTop: 20,
    },
    sectionContainer: {
        marginTop: 20,
    },
    wordItem: {
        fontSize: 15,
        marginBottom: 5,
    },
    phonemeItem: {
        fontSize: 14,
        marginBottom: 3,
    },
    timeInfo: {
        fontSize: 12,
        color: '#666',
    },
    wordLabel: {
        fontSize: 13,
        fontStyle: 'italic',
        color: '#444',
    },
    phonemesText: {
        fontSize: 18,
        lineHeight: 24,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        color: '#2196F3',
    },
    wordContainer: {
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    wordHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    wordText: {
        fontSize: 17,
        fontWeight: '600',
    },
    wordDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    confidenceText: {
        fontSize: 12,
        color: '#4CAF50',
        fontWeight: '500',
    },
    phonemeText: {
        fontSize: 16,
        color: '#2196F3',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    }
});