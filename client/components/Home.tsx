import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, Image } from 'react-native';
import { useAuthUser } from '../utils/useAuthUser';
import { Ionicons, FontAwesome5, MaterialCommunityIcons, AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface HomeProps {
  navigation: any;
  route: any;
}

export default function Home({ navigation, route }: HomeProps) {
  const { authUser } = useAuthUser();
  const { avatar, fname, lname } = { avatar: authUser.avatar, fname: authUser.fname, lname: authUser.lname };

  // Mock data for streak and ratings (to be replaced with real data later)
  const userStreak = 7;
  const userRating = 4.5;
  const totalXP = 1240;

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<AntDesign key={i} name="star" size={16} color="#FFD700" />);
      } else if (i === fullStars && halfStar) {
        stars.push(<AntDesign key={i} name="staro" size={16} color="#FFD700" />);
      } else {
        stars.push(<AntDesign key={i} name="staro" size={16} color="#DDDDDD" />);
      }
    }
    return stars;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* User Stats Header */}
      <LinearGradient
        colors={['#4c66ef', '#3b5fe2']}
        style={styles.statsContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.userInfoSection}>
          <Image 
            source={avatar ? { uri: avatar } : require('../assets/avatar-default.svg')} 
            style={styles.avatar}
          />
          <View style={styles.userTextInfo}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{fname} {lname}</Text>
            <View style={styles.ratingContainer}>
              {renderStars(userRating)}
              <Text style={styles.ratingText}>{userRating.toFixed(1)}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="flame" size={24} color="#FF9500" />
            </View>
            <Text style={styles.statValue}>{userStreak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="trophy" size={24} color="#FFD700" />
            </View>
            <Text style={styles.statValue}>{totalXP}</Text>
            <Text style={styles.statLabel}>Total XP</Text>
          </View>
        </View>
      </LinearGradient>

      <Text style={styles.sectionTitle}>Learning Activities</Text>

      <View style={styles.cardContainer}>
        <TouchableOpacity style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: '#e3f2fd' }]}>
            <MaterialCommunityIcons name="book-open-variant" size={28} color="#1976d2" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Vocabulary</Text>
            <Text style={styles.cardDescription}>Learn new words and phrases</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('ExamQuiz')}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#e8f5e9' }]}>
            <FontAwesome5 name="pencil-alt" size={24} color="#388e3c" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Grammar</Text>
            <Text style={styles.cardDescription}>Practice English grammar rules</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('SetUpSubjectAndType')}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#fff3e0' }]}>
            <Ionicons name="headset" size={28} color="#ff9800" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Listening</Text>
            <Text style={styles.cardDescription}>Improve your listening skills</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.card}
          onPress={() => navigation.navigate('SetUpSpeakingExercise')}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#f3e5f5' }]}>
            <FontAwesome5 name="microphone" size={24} color="#9c27b0" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Speaking</Text>
            <Text style={styles.cardDescription}>Practice pronunciation</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('ListQuestionsScreen')}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#e1f5fe' }]}>
            <MaterialCommunityIcons name="comment-question" size={28} color="#0288d1" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Answer Questions</Text>
            <Text style={styles.cardDescription}>Practice with real questions</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('SpeechToTextTest')}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#ffebee' }]}>
            <Ionicons name="mic-circle" size={28} color="#d32f2f" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Test Speaking</Text>
            <Text style={styles.cardDescription}>Test your speaking skills</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.featuredSection}>
        <Text style={styles.featuredTitle}>Daily Challenge</Text>
        <TouchableOpacity style={styles.featuredCard}>
          <LinearGradient
            colors={['#4CAF50', '#2E7D32']}
            style={styles.featuredGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="calendar" size={32} color="#fff" />
            <View style={styles.featuredTextContainer}>
              <Text style={styles.featuredCardTitle}>Today's Challenge</Text>
              <Text style={styles.featuredCardDescription}>Complete a 5-minute speaking exercise</Text>
            </View>
            <Ionicons name="chevron-forward-circle" size={28} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  statsContainer: {
    padding: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  userInfoSection: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
    borderWidth: 2,
    borderColor: 'white',
  },
  userTextInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: 'white',
    marginLeft: 5,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 15,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    height: '80%',
    alignSelf: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginBottom: 15,
    marginTop: 10,
    color: '#333',
  },
  cardContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  card: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
    flexDirection: 'column',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#777',
  },
  featuredSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  featuredTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  featuredCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featuredGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  featuredTextContainer: {
    flex: 1,
    marginLeft: 15,
    marginRight: 10,
  },
  featuredCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  featuredCardDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
});