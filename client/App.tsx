import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useAuthUser } from './utils/useAuthUser';
import AuthNavigator from './navigations/AuthNavigator';
import MainNavigator from './navigations/MainNavigator';
import LoadingNavigator from './navigations/LoadingNavigator';
import ExamQuiz from './components/Exam/ExamQuiz';
import ExamResults from './components/Exam/ExamResults';

import SetUpSubjectAndType from './components/ListeningExam/SetUpSubjectAndType';
import SingleExamTest from './components/ListeningExam/SingleExamTest';
import SingleExamResults from './components/ListeningExam/SingleExamResults';

import SpeechToTextTest from './components/SpeakingExam/Test';
import SetUpSpeakingExercise from './components/SpeakingExam/SetUpSpeakingExercise';
import SpeakingExamResults from './components/SpeakingExam/ExamResults';
import SpeakingExerciseTest from './components/SpeakingExam/ExamTest';

import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
const Stack = createNativeStackNavigator();
export default function App() {
  const { checkValidToken } = useAuthUser();
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    const checkToken = async () => {
      const isValidToken = await checkValidToken();
      setInitialRoute(isValidToken ? 'Main' : 'Auth');
    };
    checkToken();
  }, []);

  if (initialRoute === null) {
    return <LoadingNavigator />;
  }

  return (
    // <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <NavigationContainer>
          <Stack.Navigator initialRouteName={initialRoute}>
            <Stack.Screen
              name="Auth"
              component={AuthNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Main"
              component={MainNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ExamQuiz"
              component={ExamQuiz}
              options={{
                headerTitle: 'Exam Quiz',
                headerBackTitle: 'Exit Exam',
                headerShown: false,
                headerBackVisible: false
              }}
            />
            <Stack.Screen
              name="ExamResults"
              component={ExamResults}
              options={{
                headerTitle: 'Exam Results',
                headerShown: false
              }}
            />
            <Stack.Screen
              name="SetUpSubjectAndType"
              component={SetUpSubjectAndType}
              options={{
                headerTitle: 'Speaking Exam Setup',
                headerShown: true
              }}
            />
            <Stack.Screen
              name="SingleExamTest"
              component={SingleExamTest}
              options={{
                headerTitle: 'Listening Test',
                headerShown: false
              }}
            />
            <Stack.Screen
              name="SingleExamResults"
              component={SingleExamResults}
              options={{
                headerTitle: 'Test Results',
                headerShown: false
              }}
            />
            <Stack.Screen
              name="SpeechToTextTest"
              component={SpeechToTextTest}
              options={{
                headerTitle: 'Speech to Text Test',
                headerShown: true
              }}
            />

            <Stack.Screen
              name="SetUpSpeakingExercise"
              component={SetUpSpeakingExercise}
              options={{ 
                headerTitle: 'Speaking Exercise Setup',
                headerShown: true
              }}
            />

            <Stack.Screen
              name="SpeakingExamResults"
              component={SpeakingExamResults}
              options={{
                headerTitle: 'Speaking Exam Results',
                headerShown: false
              }}
            />

            <Stack.Screen
              name="SpeakingExerciseTest"
              component={SpeakingExerciseTest}
              options={{
                headerTitle: 'Speaking Exercise Test',
                headerShown: false
              }}
            />


          </Stack.Navigator>
          <StatusBar style="auto" />
        </NavigationContainer>
      </SafeAreaView>
    // {/* </SafeAreaProvider> */}
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});