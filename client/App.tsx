import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useAuthUser } from './utils/useAuthUser';
import AuthNavigator from './navigations/AuthNavigator';
import MainNavigator from './navigations/MainNavigator';
import LoadingNavigator from './navigations/LoadingNavigator';
import ExamQuiz from './components/Exam/ExamQuiz';
import ExamResults from './components/Exam/ExamResults';
import SetUpSubjectAndType from './components/SpeakingExam/SetUpSubjectAndType';
import SingleExamTest from './components/SpeakingExam/SingleExamTest';
import SingleExamResults from './components/SpeakingExam/SingleExamResults';

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
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}