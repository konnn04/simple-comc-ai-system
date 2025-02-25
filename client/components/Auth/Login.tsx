import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { Form, Button, Container, Row, Col } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useAuthUser } from '../../utils/useAuthUser';

interface LoginProps {
  navigation: any;
}

export default function Login({ navigation }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { saveAuthUser } = useAuthUser();
  const [alert, setAlert] = useState<{ type: string, message: string } | null>(null);

  const handleLogin = async () => {
    try {
      const response = await fetch('http://localhost:5000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          'usernameOrEmail': username,
          password,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        await saveAuthUser({ token: data.token, fname: data.fname, lname: data.lname, avatar: data.avatar });
        navigation.navigate('Main');
      } else {
        // Alert.alert('Login Failed', data.message || 'Invalid credentials');
        setAlert({ type: 'danger', message: data.message || 'Invalid credentials' });
      }
    } catch (error) {
      console.error('An error occurred:', error);
      // Alert.alert('An error occurred. Please try again later.');
      setAlert({ type: 'danger', message: 'An error occurred. Please try again later.' });
    }
  };

  return (
    <Container>
      <Row className="justify-content-md-center">
        <Col md={6}>
          <div className="text-center mb-4">
            <img src="/static/logo.jpg" alt="Logo" className="mb-4" style={{ width: 100, height: 100 }} />
            <h1 className="h3 mb-3 font-weight-normal">English Learning App</h1>
          </div>
          {alert && (
            <div className={`alert alert-${alert.type} mb-3`} role="alert">
              {alert.message}
            </div>
          )}
          <Form>
            <Form.Group controlId="formUsername">
              <Form.Label>Username</Form.Label>
              <Form.Control
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Form.Group>

            <Form.Group controlId="formPassword">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Form.Group>

            <Button variant="primary" type="button" onClick={handleLogin} className="w-100 mt-2">
              Login
            </Button>

            <Button variant="link" type="button" onClick={() => navigation.navigate('Register')} className="w-100">
              Don't have an account? Register
            </Button>
          </Form>
        </Col>
      </Row>
    </Container>
  );
}