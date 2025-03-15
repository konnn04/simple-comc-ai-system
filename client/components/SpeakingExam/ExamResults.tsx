import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  Platform 
} from 'react-native';

interface ExamResultsProps {
  navigation: any;
  route: any;
}

export default function SpeakingExamResults({ navigation, route }: ExamResultsProps) {
  const { 
    message, 
    exam_id, 
    overall_score, 
    attempts, 
    exercise, 
    timeElapsed 
  } = route.params;

  // Format time display (mm:ss)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate completion stats
  const totalItems = exercise ? exercise.items.length : 0;
  const completedItems = attempts.filter((questionAttempts: any[]) => 
    questionAttempts.some((attempt: { completed: any; }) => attempt.completed)
  ).length;
  
  // Calculate average confidence score for completed attempts
  let totalConfidence = 0;
  let completedAttempts = 0;
  
  attempts.forEach((itemAttempts: any[]) => {
    itemAttempts.forEach((attempt: { completed: any; conf: number; }) => {
      if (attempt.completed && attempt.conf) {
        totalConfidence += attempt.conf;
        completedAttempts++;
      }
    });
  });
  
  const averageConfidence = completedAttempts > 0 
    ? (totalConfidence / completedAttempts) * 100 
    : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Speaking Exercise Results</Text>
      </View>
      
      <ScrollView style={styles.contentContainer}>
        <View style={styles.summaryCard}>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>Overall Score</Text>
            <Text style={styles.scoreValue}>{overall_score}%</Text>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{exercise.subject}</Text>
              <Text style={styles.statLabel}>Subject</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {['Easy', 'Medium', 'Hard'][exercise.difficulty - 1]}
              </Text>
              <Text style={styles.statLabel}>Difficulty</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatTime(timeElapsed)}</Text>
              <Text style={styles.statLabel}>Time</Text>
            </View>
          </View>
          
          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
          
          <View style={styles.completionContainer}>
            <Text style={styles.completionText}>
              Completed: {completedItems}/{totalItems} items
            </Text>
            <Text style={styles.completionText}>
              Avg. Accuracy: {averageConfidence.toFixed(1)}%
            </Text>
          </View>
        </View>
        
        <Text style={styles.sectionTitle}>Detailed Results</Text>
        
        {exercise.items.map((item: { text: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; phonemes: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; }, itemIndex: number) => (
          <View key={itemIndex} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemNumberText}>Item {itemIndex + 1}</Text>
              {attempts[itemIndex]?.some((attempt: { completed: any; }) => attempt.completed) ? (
                <View style={styles.passedBadge}>
                  <Text style={styles.badgeText}>PASSED</Text>
                </View>
              ) : (
                <View style={styles.failedBadge}>
                  <Text style={styles.badgeText}>FAILED</Text>
                </View>
              )}
            </View>
            
            <View style={styles.expectedTextContainer}>
              <Text style={styles.expectedTextLabel}>Expected:</Text>
              <Text style={styles.expectedText}>{item.text}</Text>
              
              <View style={styles.phoneticContainer}>
                <Text style={styles.phoneticLabel}>Phonetic:</Text>
                <Text style={styles.phoneticText}>/{item.phonemes}/</Text>
              </View>
            </View>
            
            <View style={styles.attemptsContainer}>
              <Text style={styles.attemptsLabel}>Your Attempts:</Text>
              
              {attempts[itemIndex]?.map((attempt: { recognized_text: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; completed: any; conf: any; }, attemptIndex: number) => (
                attempt.recognized_text ? (
                  <View 
                    key={attemptIndex} 
                    style={[
                      styles.attemptItem,
                      attempt.completed ? styles.completedAttempt : styles.failedAttempt
                    ]}
                  >
                    <Text style={styles.attemptNumber}>Attempt {attemptIndex + 1}</Text>
                    <Text style={styles.recognizedText}>"{attempt.recognized_text}"</Text>
                    <View style={styles.confidenceContainer}>
                      <Text style={styles.confidenceText}>
                        Accuracy: {(attempt.conf! * 100).toFixed(0)}%
                      </Text>
                      <Text style={attempt.completed ? styles.passedText : styles.failedText}>
                        {attempt.completed ? 'PASSED' : 'FAILED'}
                      </Text>
                    </View>
                  </View>
                ) : null
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.navigate('Main')}
        >
          <Text style={styles.homeButtonText}>Return to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  contentContainer: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  scoreValue: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  messageContainer: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  messageText: {
    fontSize: 16,
    color: '#0d47a1',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  completionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  completionText: {
    fontSize: 16,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  itemNumberText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  passedBadge: {
    backgroundColor: '#4CAF50',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  failedBadge: {
    backgroundColor: '#F44336',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  badgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  expectedTextContainer: {
    backgroundColor: '#f7f9fc',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  expectedTextLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  expectedText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
  },
  phoneticContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 5,
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
  attemptsContainer: {
    marginTop: 10,
  },
  attemptsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
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
    color: '#333',
  },
  recognizedText: {
    fontSize: 16,
    marginBottom: 8,
    fontStyle: 'italic',
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
    fontWeight: '500',
    color: '#4CAF50',
  },
  failedText: {
    fontWeight: '500',
    color: '#f44336',
  },
  footer: {
    marginTop: 20,
    marginBottom: 10,
  },
  homeButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 50,
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});