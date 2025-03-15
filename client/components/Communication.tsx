import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { authenticatedFetch } from '../utils/api';
import { HOST } from '../constants/server';
import * as FileSystem from 'expo-file-system';

interface Message {
  text: string;
  isUser: boolean;
  audio_path?: string;
  timestamp: number;
}

export default function Communication({ navigation }: { navigation: any }) {
  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [topic, setTopic] = useState<string>('travel in Vietnam');
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Audio recording state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Refs
  const scrollViewRef = useRef<ScrollView>(null);

  // Request mic permission on component mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'You need to grant audio recording permissions to use this feature.');
        }
        
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
    
    // Cleanup function
    return () => {
      if (timerInterval) clearInterval(timerInterval);
      if (sound) {
        sound.unloadAsync();
      }
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Start a new conversation
  const startConversation = async () => {
    if (!topic.trim()) {
      Alert.alert('Error', 'Please enter a topic');
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await authenticatedFetch('api/conversation/start', {
        method: 'POST',
        body: JSON.stringify({
          topic: topic.trim()
        })
      }, navigation);

      if (!response.ok) {
        throw new Error('Failed to start conversation');
      }

      const data = await response.json();
      
      if (data.success) {
        setSessionId(data.session_id);
        setMessages([
          {
            text: data.greeting_text,
            isUser: false,
            audio_path: data.audio_path,
            timestamp: Date.now()
          }
        ]);
        
        // Play the greeting audio
        playAudio(data.audio_path);
      } else {
        throw new Error('Server returned error');
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Send a text message
  const sendTextMessage = async () => {
    if (!sessionId || !textInput.trim()) return;

    const userMessage = textInput.trim();
    setTextInput('');
    
    // Add user message to chat
    setMessages(prev => [
      ...prev, 
      {
        text: userMessage,
        isUser: true,
        timestamp: Date.now()
      }
    ]);

    try {
      setIsLoading(true);
      
      const response = await authenticatedFetch('api/conversation/send-text', {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionId,
          text: userMessage,
          topic: topic
        })
      }, navigation);

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      if (data.success) {
        // Add bot response to chat
        setMessages(prev => [
          ...prev,
          {
            text: data.response_text,
            isUser: false,
            audio_path: data.audio_path,
            timestamp: Date.now()
          }
        ]);
        
        // Play the response audio
        playAudio(data.audio_path);
      } else {
        throw new Error('Server returned error');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Start audio recording
  const startRecording = async () => {
    try {
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

  // Stop audio recording and send to API
  const stopRecording = async () => {
    if (!recording || !sessionId) return;

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

      // Process and send the recording
      await sendAudioMessage(uri);

      // Reset recording state
      setRecording(null);

    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
      setIsRecording(false);
      setRecording(null);
    }
  };

  // Cancel recording without sending
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

  // Send audio recording to API
  const sendAudioMessage = async (uri: string) => {
    if (!sessionId) return;

    try {
      setIsLoading(true);

      // Add user's audio message to chat (as a placeholder until we get transcription)
      setMessages(prev => [
        ...prev,
        {
          text: "Recording sent...",
          isUser: true,
          timestamp: Date.now()
        }
      ]);

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

      // Add session and topic info
      formData.append('session_id', sessionId);
      formData.append('topic', topic);

      // Send request to API
      const response = await authenticatedFetch(
        'api/conversation/send-audio',
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
      const data = await response.json();
      
      if (data.success) {
        // Update the last user message with transcription (if available)
        setMessages(prev => {
          const newMessages = [...prev];
          // Find and update the last user message
          for (let i = newMessages.length - 1; i >= 0; i--) {
            if (newMessages[i].isUser) {
              newMessages[i] = {
                ...newMessages[i],
                text: data.user_text || "Audio message sent", // Use transcription if available
              };
              break;
            }
          }
          return newMessages;
        });
        
        // Add bot response to chat
        setMessages(prev => [
          ...prev,
          {
            text: data.response_text,
            isUser: false,
            audio_path: data.audio_path,
            timestamp: Date.now()
          }
        ]);
        
        // Play the response audio
        playAudio(data.audio_path);
      } else {
        throw new Error('Server returned error');
      }
    } catch (error) {
      console.error('Error sending audio message:', error);
      Alert.alert('Error', 'Failed to send audio message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Play audio from server
  const playAudio = async (audioPath: string | undefined) => {
    if (!audioPath) return;
    
    try {
      // Stop any currently playing audio
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
      }
      
      setIsPlaying(true);
      setCurrentlyPlayingId(audioPath);
      
      // Load and play the audio
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: `${HOST}${audioPath}` },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
            setCurrentlyPlayingId(null);
          }
        }
      );
      
      setSound(newSound);
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
      setCurrentlyPlayingId(null);
    }
  };

  // Format recording duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Render a chat message
  const renderMessage = (message: Message, index: number) => {
    const isLast = index === messages.length - 1;
    
    return (
      <View 
        key={message.timestamp} 
        style={[
          styles.messageContainer, 
          message.isUser ? styles.userMessageContainer : styles.botMessageContainer
        ]}
      >
        <View style={[styles.messageBubble, message.isUser ? styles.userBubble : styles.botBubble]}>
          <Text style={styles.messageText}>{message.text}</Text>
        </View>
        
        {!message.isUser && message.audio_path && (
          <TouchableOpacity 
            style={styles.playButton}
            onPress={() => playAudio(message.audio_path)}
            disabled={isPlaying && currentlyPlayingId === message.audio_path}
          >
            {isPlaying && currentlyPlayingId === message.audio_path ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Ionicons name="play-circle" size={24} color="#007AFF" />
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.topicContainer}>
        <TextInput
          style={styles.topicInput}
          placeholder="Enter conversation topic"
          value={topic}
          onChangeText={setTopic}
          editable={!sessionId} // Disable once conversation has started
        />
        
        {!sessionId && (
          <TouchableOpacity 
            style={styles.startButton}
            onPress={startConversation}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Start</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((message, index) => renderMessage(message, index))}
      </ScrollView>

      <View style={styles.inputContainer}>
        {isRecording && (
          <View style={styles.recordingStatus}>
            <View style={styles.recordingIndicator}>
              <View style={[styles.recordingDot, { backgroundColor: '#FF3B30' }]} />
            </View>
            <Text style={styles.recordingText}>Recording: {formatDuration(recordingDuration)}</Text>
          </View>
        )}
        
        {!isRecording ? (
          <>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              value={textInput}
              onChangeText={setTextInput}
              multiline
              editable={!!sessionId && !isLoading}
            />
            
            {sessionId && (
              <>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={sendTextMessage}
                  disabled={!textInput.trim() || isLoading}
                >
                  <Ionicons name="send" size={24} color={!textInput.trim() || isLoading ? '#ccc' : '#007AFF'} />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={startRecording}
                  disabled={isLoading}
                >
                  <Ionicons name="mic" size={24} color={isLoading ? '#ccc' : '#007AFF'} />
                </TouchableOpacity>
              </>
            )}
          </>
        ) : (
          <View style={styles.recordingControls}>
            <TouchableOpacity
              style={[styles.recordButton, styles.cancelButton]}
              onPress={cancelRecording}
            >
              <Ionicons name="close-circle" size={24} color="#FF3B30" />
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.recordButton, styles.stopButton]}
              onPress={stopRecording}
            >
              <Ionicons name="stop-circle" size={32} color="#FF3B30" />
              <Text style={styles.stopText}>Stop</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  topicContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  topicInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 10,
    paddingBottom: 16,
  },
  messageContainer: {
    marginVertical: 5,
    maxWidth: '80%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  botMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  userBubble: {
    backgroundColor: '#DCF8C6',
    borderColor: '#c5e1a5',
    marginLeft: 8,
  },
  botBubble: {
    backgroundColor: '#fff',
    marginRight: 8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  playButton: {
    padding: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    padding: 10,
    paddingHorizontal: 16,
    maxHeight: 100,
    backgroundColor: '#fff',
  },
  iconButton: {
    padding: 10,
  },
  recordingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  recordingIndicator: {
    marginRight: 8,
    padding: 4,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
  },
  recordingText: {
    color: '#FF3B30',
    fontSize: 16,
  },
  recordingControls: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 8,
  },
  recordButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  cancelButton: {
    marginRight: 20,
  },
  stopButton: {
    marginLeft: 20,
  },
  cancelText: {
    marginTop: 4,
    color: '#FF3B30',
  },
  stopText: {
    marginTop: 4,
    color: '#FF3B30',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});