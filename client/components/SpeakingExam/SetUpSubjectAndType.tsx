import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Form, Button, Container, Row, Col } from 'react-bootstrap';
import { Radio, RadioGroup, FormControlLabel, FormControl, FormLabel, TextField } from '@mui/material';

interface SetUpSubjectAndTypeProps {
  navigation: any;
}

export default function SetUpSubjectAndType({ navigation }: SetUpSubjectAndTypeProps) {
  const [subjectType, setSubjectType] = useState('predefined');
  const [customSubject, setCustomSubject] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('General English');
  const [examType, setExamType] = useState('single');

  const predefinedSubjects = [
    'General English',
    'Business English',
    'Academic English',
    'Travel & Tourism',
    'Technology',
    'Health & Medicine'
  ];

  const handleCustomSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    if (text.length <= 50) {
      setCustomSubject(text);
    }
  };

  const handleStartExam = () => {
    const subject = subjectType === 'custom' ? customSubject : selectedSubject;
    
    if (subjectType === 'custom' && customSubject.trim() === '') {
      Alert.alert('Error', 'Please enter a subject');
      return;
    }
    
    navigation.navigate('SingleExamTest', {
      subject,
      examType
    });
  };

  return (
    <Container>
      <Row className="justify-content-md-center">
        <Col md={8}>
          <div className="text-center mb-4">
            <h1 className="h3 mb-3 font-weight-normal">Speaking Exam Setup</h1>
          </div>
          
          <FormControl component="fieldset" className="mb-4 w-100">
            <FormLabel component="legend">Subject Selection</FormLabel>
            <RadioGroup 
              row 
              value={subjectType} 
              onChange={(e) => setSubjectType(e.target.value)}
            >
              <FormControlLabel value="predefined" control={<Radio />} label="Choose from list" />
              <FormControlLabel value="custom" control={<Radio />} label="Custom subject" />
            </RadioGroup>
            
            {subjectType === 'predefined' ? (
              <div className="mt-3">
                <Form.Group>
                  <Form.Label>Select Subject</Form.Label>
                  <Form.Control
                    as="select"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                  >
                    {predefinedSubjects.map((subject, index) => (
                      <option key={index} value={subject}>{subject}</option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </div>
            ) : (
              <div className="mt-3">
                <TextField
                  label="Enter Custom Subject"
                  variant="outlined"
                  fullWidth
                  value={customSubject}
                  onChange={handleCustomSubjectChange}
                  helperText={`${customSubject.length}/50 characters`}
                  error={customSubject.length >= 50}
                />
              </div>
            )}
          </FormControl>
          
          <FormControl component="fieldset" className="mb-4 w-100">
            <FormLabel component="legend">Exam Type</FormLabel>
            <RadioGroup 
              row 
              value={examType} 
              onChange={(e) => setExamType(e.target.value)}
            >
              <FormControlLabel value="single" control={<Radio />} label="Single Speech" />
              <FormControlLabel value="conversation" control={<Radio />} label="Conversation" />
            </RadioGroup>
          </FormControl>
          
          <Button
            variant="primary"
            type="button"
            onClick={handleStartExam}
            className="w-100 mt-3"
          >
            Start Exam
          </Button>
        </Col>
      </Row>
    </Container>
  );
}