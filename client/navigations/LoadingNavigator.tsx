import React from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Image } from 'react-native';
import { Container, Row, Col } from 'react-bootstrap'
import Loading from '../components/Loading';


export default function LoadingNavigator() {
  return (
    <Container>
      <Row className="justify-content-md-center">
        <Col md={6}>
          <div className="text-center mb-4">
            <img src="/static/logo.jpg" alt="Logo" className="mb-4" style={{ width: 100, height: 100 }} />
            <h1 className="h3 mb-3 font-weight-normal">English Learning App</h1>
          </div>
          <Loading />
        </Col>
      </Row>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: '#000',
  },
});