import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';

interface ResultItem {
  correct: boolean;
  correct_answer: string | boolean | number;
  user_answer: string | boolean | number;
}

interface SingleExamResultsProps {
  navigation: any;
  route: any;
}

export default function SingleExamResults({ navigation, route }: SingleExamResultsProps) {
  const { score, results, transcript, questions, subject, timeElapsed } = route.params;
  const [showTranscript, setShowTranscript] = useState(false);
  const [showDetails, setShowDetails] = useState(false); 

  const getScoreColor = () => {
    const percentage = (score / questions.length) * 100;
    if (percentage >= 80) return '#4CAF50'; // Green for high scores
    if (percentage >= 60) return '#FF9800'; // Orange for medium scores
    return '#F44336'; // Red for low scores
  };

  const getResultMessage = () => {
    const percentage = (score / questions.length) * 100;
    if (percentage >= 90) return 'Excellent job!';
    if (percentage >= 80) return 'Great work!';
    if (percentage >= 70) return 'Good job!';
    if (percentage >= 60) return 'Not bad!';
    if (percentage >= 50) return 'You passed!';
    return 'Keep practicing!';
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} min ${secs} sec`;
  };
  
  const renderAnswerContent = (question: any, result: ResultItem, index: number) => {
    switch (question.type) {
      case 'multiple_choice':
        const options = question.options || [];
        return (
          <View>
            {options.map((option: string, optIdx: number) => {
              // Convert letter answers to indices (A -> 0, B -> 1, etc.)
              const correctIdx = question.correct_answer.charCodeAt(0) - 65;
              const userIdx = typeof result.user_answer === 'string' ? 
                result.user_answer.charCodeAt(0) - 65 : result.user_answer;
              
              // Determine the style based on whether this option was selected and correct
              const isCorrectOption = optIdx === correctIdx;
              const isUserSelected = optIdx === userIdx;
              
              let optionStyle = styles.optionReview;
              if (isUserSelected && isCorrectOption) {
                optionStyle = {...optionStyle, ...styles.correctOption};
              } else if (isUserSelected && !isCorrectOption) {
                optionStyle = {...optionStyle, ...styles.incorrectOption};
              } else if (!isUserSelected && isCorrectOption) {
                optionStyle = {...optionStyle, ...styles.correctOptionNotSelected};
              }
              
              return (
                <View key={optIdx} style={[optionStyle]}>
                  <Text style={styles.optionLetter}>{String.fromCharCode(65 + optIdx)}</Text>
                  <Text style={styles.optionText}>{option}</Text>
                  {isCorrectOption && <Text style={styles.correctMark}>✓</Text>}
                  {isUserSelected && !isCorrectOption && <Text style={styles.incorrectMark}>✗</Text>}
                </View>
              );
            })}
          </View>
        );
        
      case 'fill_in_the_blank':
        return (
          <View style={styles.fillBlankResultContainer}>
            <Text style={styles.resultLabel}>Your answer: </Text>
            <Text style={result.correct ? styles.correctAnswer : styles.incorrectAnswer}>
              {result.user_answer?.toString() || 'Not answered'}
            </Text>
            <Text style={styles.resultLabel}>Correct answer: </Text>
            <Text style={styles.correctAnswer}>{result.correct_answer?.toString()}</Text>
          </View>
        );
        
      case 'true_or_false':
        return (
          <View style={styles.trueFalseResultContainer}>
            <Text style={styles.resultLabel}>Your answer: </Text>
            <Text style={result.correct ? styles.correctAnswer : styles.incorrectAnswer}>
              {result.user_answer === true ? 'True' : result.user_answer === false ? 'False' : 'Not answered'}
            </Text>
            <Text style={styles.resultLabel}>Correct answer: </Text>
            <Text style={styles.correctAnswer}>
              {result.correct_answer === true ? 'True' : 'False'}
            </Text>
          </View>
        );
        
      default:
        return <Text>Unknown question type</Text>;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Listening Exam Results</Text>
      
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreLabel}>Your Score</Text>
        <Text style={[styles.scoreValue, { color: getScoreColor() }]}>
          {score} / {questions.length}
        </Text>
        <Text style={styles.scorePercentage}>
          {Math.round((score / questions.length) * 100)}%
        </Text>
        <Text style={styles.resultMessage}>{getResultMessage()}</Text>
        <Text style={styles.timeInfo}>Time taken: {formatTime(timeElapsed)}</Text>
      </View>
      
      <TouchableOpacity 
        style={styles.toggleButton}
        onPress={() => setShowTranscript(!showTranscript)}
      >
        <Text style={styles.toggleButtonText}>
          {showTranscript ? 'Hide Transcript' : 'Show Transcript'}
        </Text>
      </TouchableOpacity>
      
      {showTranscript && (
        <View style={styles.transcriptContainer}>
          <Text style={styles.transcriptTitle}>Audio Transcript</Text>
          <ScrollView style={styles.transcriptScroll}>
            <Text style={styles.transcriptText}>{transcript}</Text>
          </ScrollView>
        </View>
      )}
      
      <TouchableOpacity 
        style={[
          styles.toggleButton, 
          showDetails ? styles.hideResultsButton : styles.showResultsButton
        ]}
        onPress={() => setShowDetails(!showDetails)}
      >
        <Text style={styles.toggleButtonText}>
          {showDetails ? 'Hide Detailed Results' : 'Show Detailed Results'}
        </Text>
      </TouchableOpacity>

      {showDetails && (
        <View style={styles.reviewOuterContainer}>
          <Text style={styles.reviewTitle}>Review Your Answers</Text>
          
          <ScrollView style={styles.detailedResultsContainer}>
            {questions.map((question: any, index: number) => {
              const result = results[index];
              
              return (
                <View key={index} style={styles.questionReview}>
                  <Text style={styles.questionIndexText}>Question {index + 1}</Text>
                  <Text style={styles.questionText}>{question.question}</Text>
                  
                  {renderAnswerContent(question, result, index)}
                  
                  <View style={styles.explanationContainer}>
                    <Text style={styles.explanationTitle}>Explanation:</Text>
                    <Text style={styles.explanationText}>{question.explanation || 'No explanation available'}</Text>
                  </View>
                  
                  <View style={styles.resultIndicator}>
                    <Text style={result.correct ? styles.correctIndicator : styles.incorrectIndicator}>
                      {result.correct ? 'Correct ✓' : 'Incorrect ✗'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}
      
      <TouchableOpacity 
        style={styles.homeButton}
        onPress={() => navigation.navigate('Main')}
      >
        <Text style={styles.homeButtonText}>Return to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 0,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  scoreContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  scorePercentage: {
    fontSize: 24,
    color: '#666',
    marginBottom: 10,
  },
  resultMessage: {
    fontSize: 20,
    fontWeight: '500',
  },
  timeInfo: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  toggleButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 15,
  },
  toggleButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  transcriptContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  transcriptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  transcriptScroll: {
    maxHeight: 200,
  },
  transcriptText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  reviewContainer: {
    flex: 0,
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: 15,
  },
  questionReview: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    position: 'relative',
  },
  questionIndexText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 15,
  },
  optionReview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 5,
    marginBottom: 5,
    backgroundColor: '#f5f5f5',
  },
  correctOption: {
    backgroundColor: '#e8f5e9',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  incorrectOption: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  correctOptionNotSelected: {
    backgroundColor: '#f1f8e9',
    borderLeftWidth: 4,
    borderLeftColor: '#8BC34A',
    borderStyle: 'dashed',
  },
  optionLetter: {
    fontWeight: 'bold',
    marginRight: 10,
    fontSize: 16,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
  },
  correctMark: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 18,
  },
  incorrectMark: {
    color: '#F44336',
    fontWeight: 'bold',
    fontSize: 18,
  },
  trueFalseResultContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
  },
  fillBlankResultContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
  },
  resultLabel: {
    fontWeight: 'bold',
    marginBottom: 5,
    fontSize: 14,
  },
  correctAnswer: {
    color: '#4CAF50',
    marginBottom: 10,
    fontSize: 16,
  },
  incorrectAnswer: {
    color: '#F44336',
    marginBottom: 10,
    fontSize: 16,
  },
  explanationContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
  },
  explanationTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 5,
  },
  explanationText: {
    fontSize: 14,
    color: '#555',
  },
  resultIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  correctIndicator: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  incorrectIndicator: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  homeButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  homeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  showResultsButton: {
    backgroundColor: '#2196F3',
  },
  hideResultsButton: {
    backgroundColor: '#607D8B',
  },
  reviewOuterContainer: {
    marginBottom: 20,
  },
  detailedResultsContainer: {
    flex: 0,
  },
});