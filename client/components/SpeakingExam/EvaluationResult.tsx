import React from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';

interface WordAnalysis {
  expected_word: string;
  result_word: string;
  expected_phonemes: string;
  result_phonemes: string;
  pronunciation_score: number;
  errors: string[];
  error_details: Array<{type: string; expected: string; result?: string}>;
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
  resutl_text: string; // Note: Keeping the typo from API response
  result_text: string;  // Add correct field name
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

interface EvaluationResultProps {
  attempt: RecordingAttempt;
  attemptNumber: number;
}

const EvaluationResult = ({ attempt, attemptNumber }: EvaluationResultProps) => {
  if (!attempt.evaluation) return null;
  
  // Use either result_text or resutl_text (handling API inconsistency)
  const { 
    accuracy_score, 
    word_level_analysis, 
    result_text,
    resutl_text
  } = attempt.evaluation;
  
  const displayText = result_text || resutl_text;
  
  // Determine assessment level
  let assessmentLevel = 'Poor';
  let assessmentStyle = styles.poorText;
  if (accuracy_score > 0.9) {
    assessmentLevel = 'Excellent';
    assessmentStyle = styles.excellentText;
  } else if (accuracy_score > 0.8) {
    assessmentLevel = 'Good';
    assessmentStyle = styles.goodText;
  } else if (accuracy_score > 0.7) {
    assessmentLevel = 'Fair';
    assessmentStyle = styles.fairText;
  }
  
  // Calculate percentage for display
  const accuracyPercentage = Math.round(accuracy_score * 100);
  
  // Get word text color based on pronunciation score
  const getWordScoreColor = (score: number) => {
    if (score > 90) return styles.excellentWordText;
    if (score > 80) return styles.goodWordText;
    if (score > 60) return styles.fairWordText;
    if (score > 40) return styles.poorWordText;
    return styles.veryPoorWordText;
  };
  
  return (
    <View style={[styles.attemptItem, attempt.completed ? styles.completedAttempt : styles.failedAttempt]}>
      <View style={styles.attemptHeader}>
        <Text style={styles.attemptNumber}>Attempt {attemptNumber}</Text>
        <View style={styles.accuracyBadge}>
          <Text style={styles.accuracyText}>{accuracyPercentage}%</Text>
          <Text style={[styles.assessmentText, assessmentStyle]}>{assessmentLevel}</Text>
        </View>
      </View>
      
      {/* Only show what the user said */}
      <View style={styles.speechResult}>
        <Text style={styles.speechResultText}>{displayText || "(No speech detected)"}</Text>
      </View>
      
      {/* Redesigned word analysis section */}
      <View style={styles.wordAnalysisContainer}>
        <Text style={styles.wordAnalysisTitle}>Word Analysis:</Text>
        
        <View style={styles.wordsGrid}>
          {word_level_analysis.map((word, index) => {
            const score = Math.round(word.pronunciation_score);
            const scoreColor = getWordScoreColor(score);
            const errorPercent = 100 - score;
            
            return (
              <View key={index} style={styles.wordCard}>
                <Text style={[styles.wordText, scoreColor]}>
                  {word.expected_word}
                </Text>
                
                <View style={styles.wordDetailsContainer}>
                  {errorPercent > 0 && (
                    <Text style={[styles.errorPercentage, errorPercent > 30 ? styles.highErrorText : styles.lowErrorText]}>
                      {errorPercent}% error
                    </Text>
                  )}
                  
                  {word.result_phonemes && (
                    <Text style={styles.phonemeText}>
                      /{word.result_phonemes}/
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  attemptItem: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
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
  attemptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  attemptNumber: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  accuracyBadge: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  accuracyText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 5,
  },
  assessmentText: {
    fontWeight: '500',
    fontSize: 14,
  },
  
  // New speech result display
  speechResult: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    padding: 10,
    borderRadius: 5,
    marginBottom: 8,
  },
  speechResultText: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
  
  // Redesigned word analysis
  wordAnalysisContainer: {
    marginVertical: 4,
  },
  wordAnalysisTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 6,
  },
  wordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  wordCard: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: 8,
    borderRadius: 6,
    margin: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  wordText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  wordDetailsContainer: {
    alignItems: 'center',
  },
  errorPercentage: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
  },
  highErrorText: {
    color: '#F44336',
  },
  lowErrorText: {
    color: '#FF9800',
  },
  phonemeText: {
    fontSize: 10,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 2,
  },
  
  // Word text colors based on score
  excellentWordText: {
    color: '#4CAF50', // Green
  },
  goodWordText: {
    color: '#8BC34A', // Light Green
  },
  fairWordText: {
    color: '#FFC107', // Amber/Orange
  },
  poorWordText: {
    color: '#FF9800', // Orange
  },
  veryPoorWordText: {
    color: '#F44336', // Red
  },
  // Assessment text colors
  poorText: {
    color: '#F44336', // Red
  },
  fairText: {
    color: '#FF9800', // Orange
  },
  goodText: {
    color: '#4CAF50', // Green
  },
  excellentText: {
    color: '#2196F3', // Blue
  }
});

export default EvaluationResult;
