import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';

interface Answer {
  answer: number;
  explanation: string;
}

interface Question {
  question: string;
  options: string[];
  option?: string[];
}

interface ExamResultsProps {
  navigation: any;
  route: any;
}

export default function ExamResults({ navigation, route }: ExamResultsProps) {
  const { score, exam, u_answers } = route.params;
  const questions = exam?.questions || [];
  const answers = exam?.answers || [];
  const userAnswers = u_answers || [];
  
  // State to control whether to show detailed results
  const [showResults, setShowResults] = useState(false);

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

  const getOptionStyle = (questionIndex: number, optionIndex: number) => {
    const userAnswer = userAnswers[questionIndex];
    const correctAnswer = answers[questionIndex]?.answer;
    
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
  };

  const toggleShowResults = () => {
    setShowResults(!showResults);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Exam Results</Text>

      <View style={styles.scoreContainer}>
        <Text style={styles.scoreLabel}>Your Score</Text>
        <Text style={[styles.scoreValue, { color: getScoreColor() }]}>
          {score} / {questions.length}
        </Text>
        <Text style={styles.scorePercentage}>
          {Math.round((score / questions.length) * 100)}%
        </Text>
        <Text style={styles.resultMessage}>{getResultMessage()}</Text>
      </View>

      <TouchableOpacity 
        style={[
          styles.toggleButton, 
          showResults ? styles.hideResultsButton : styles.showResultsButton
        ]}
        onPress={toggleShowResults}
      >
        <Text style={styles.toggleButtonText}>
          {showResults ? 'Hide Detailed Results' : 'Show Detailed Results'}
        </Text>
      </TouchableOpacity>

      {showResults && (
        <View style={styles.reviewOuterContainer}>
          <Text style={styles.reviewTitle}>Review Answers</Text>
          
          {/* Using ScrollView for scrollable content */}
          <ScrollView style={styles.detailedResultsContainer}>
            {questions.map((question: Question, questionIndex: number) => {
              const options: string[] = question.options || question.option || [];
              const correctAnswerIndex: number = answers[questionIndex]?.answer;
              const userAnswerIndex: number = userAnswers[questionIndex];

              return (
                <View key={questionIndex} style={styles.questionReview}>
                  <Text style={styles.questionIndexText}>Question {questionIndex + 1}</Text>
                  <Text style={styles.questionText}>{question.question}</Text>

                  {options.map((option: string, optionIndex: number) => (
                    <View
                      key={optionIndex}
                      style={getOptionStyle(questionIndex, optionIndex)}
                    >
                      <Text style={styles.optionLetter}>{String.fromCharCode(65 + optionIndex)}</Text>
                      <Text style={styles.optionText}>{option}</Text>
                      {optionIndex === correctAnswerIndex && (
                        <Text style={styles.correctMark}>✓</Text>
                      )}
                      {optionIndex === userAnswerIndex && userAnswerIndex !== correctAnswerIndex && (
                        <Text style={styles.incorrectMark}>✗</Text>
                      )}
                    </View>
                  ))}

                  <View style={styles.explanationContainer}>
                    <Text style={styles.explanationTitle}>Explanation:</Text>
                    <Text style={styles.explanationText}>
                      {answers[questionIndex]?.explanation || 'No explanation available'}
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
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    display: 'flex',
    flexDirection: 'column',
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
  toggleButton: {
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  showResultsButton: {
    backgroundColor: '#2196F3',
  },
  hideResultsButton: {
    backgroundColor: '#607D8B',
  },
  toggleButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  reviewOuterContainer: {
    // flex: 1,
    marginBottom: 20,
  },
  detailedResultsContainer: {
    flex: 1,
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