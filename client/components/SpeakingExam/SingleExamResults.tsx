import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';

interface SingleExamResultsProps {
  navigation: any;
  route: any;
}

export default function SingleExamResults({ navigation, route }: SingleExamResultsProps) {
  const { score, exam, userAnswers, transcript, timeElapsed } = route.params;
  const [showTranscript, setShowTranscript] = useState(false);
  
  const getScoreColor = () => {
    const percentage = (score / exam.questions.length) * 100;
    if (percentage >= 80) return '#4CAF50'; // Green for high scores
    if (percentage >= 60) return '#FF9800'; // Orange for medium scores
    return '#F44336'; // Red for low scores
  };

  const getResultMessage = () => {
    const percentage = (score / exam.questions.length) * 100;
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
  
  const getOptionStyle = (questionIndex: number, optionIndex: number) => {
    const question = exam.questions[questionIndex];
    const userAnswer = userAnswers[questionIndex];
    let correctAnswer;
    
    if (question.type === 'multiple_choice') {
      // Convert letter answer ('A', 'B', 'C', 'D') to index (0, 1, 2, 3)
      correctAnswer = question.correct_answer.charCodeAt(0) - 65;
      
      // User selected this option and it's correct
      if (userAnswer === optionIndex && correctAnswer === optionIndex) {
        return [styles.optionReview, styles.correctOption];
      }
      
      // User selected this option but it's wrong
      if (userAnswer === optionIndex && correctAnswer !== optionIndex) {
        return [styles.optionReview, styles.incorrectOption];
      }
      
      // User didn't select this option but it's the correct one
      if (userAnswer !== optionIndex && correctAnswer === optionIndex) {
        return [styles.optionReview, styles.correctOptionNotSelected];
      }
      
      // User didn't select this option and it's not correct
      return [styles.optionReview];
    }
    
    return [styles.optionReview];
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Listening Exam Results</Text>
      
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreLabel}>Your Score</Text>
        <Text style={[styles.scoreValue, { color: getScoreColor() }]}>
          {score} / {exam.questions.length}
        </Text>
        <Text style={styles.scorePercentage}>
          {Math.round((score / exam.questions.length) * 100)}%
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
      
      <Text style={styles.reviewTitle}>Review Your Answers</Text>
      
      <ScrollView style={styles.reviewContainer}>
        {exam.questions.map((question: any, questionIndex: number) => {
          const userAnswer = userAnswers[questionIndex];
          
          return (
            <View key={questionIndex} style={styles.questionReview}>
              <Text style={styles.questionIndexText}>Question {questionIndex + 1}</Text>
              <Text style={styles.questionText}>{question.question}</Text>
              
              {question.type === 'multiple_choice' && question.options && question.options.map((option: string, optionIndex: number) => (
                <View
                  key={optionIndex}
                  style={getOptionStyle(questionIndex, optionIndex)}
                >
                  <Text style={styles.optionLetter}>{String.fromCharCode(65 + optionIndex)}</Text>
                  <Text style={styles.optionText}>{option}</Text>
                  {optionIndex === (question.correct_answer.charCodeAt(0) - 65) && (
                    <Text style={styles.correctMark}>✓</Text>
                  )}
                  {optionIndex === userAnswer && userAnswer !== (question.correct_answer.charCodeAt(0) - 65) && (
                    <Text style={styles.incorrectMark}>✗</Text>
                  )}
                </View>
              ))}
              
              {question.type === 'true_or_false' && (
                <View style={styles.trueFalseResultContainer}>
                  <Text style={styles.resultLabel}>Your answer: </Text>
                  <Text style={userAnswer === question.correct_answer ? styles.correctAnswer : styles.incorrectAnswer}>
                    {userAnswer === true ? 'True' : userAnswer === false ? 'False' : 'Not answered'}
                  </Text>
                  <Text style={styles.resultLabel}>Correct answer: </Text>
                  <Text style={styles.correctAnswer}>{question.correct_answer === true ? 'True' : 'False'}</Text>
                </View>
              )}
              
              {question.type === 'fill_in_the_blank' && (
                <View style={styles.fillBlankResultContainer}>
                  <Text style={styles.resultLabel}>Your answer: </Text>
                  <Text style={userAnswer === question.correct_answer ? styles.correctAnswer : styles.incorrectAnswer}>
                    {userAnswer || 'Not answered'}
                  </Text>
                  <Text style={styles.resultLabel}>Correct answer: </Text>
                  <Text style={styles.correctAnswer}>{question.correct_answer}</Text>
                </View>
              )}
              
              <View style={styles.explanationContainer}>
                <Text style={styles.explanationTitle}>Explanation:</Text>
                <Text style={styles.explanationText}>{question.explanation || 'No explanation available'}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
      
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
    flex: 1,
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
    flex: 1,
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
});