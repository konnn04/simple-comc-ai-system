import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { Form, Button, Container, Row, Col } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';


export default function Register({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [dob, setDob] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [alert, setAlert] = useState<{ type: string, message: string } | null>(null);



  const handleRegister = async () => {
    if (password !== confirmPassword) {
      // alert('Passwords do not match');
      setAlert({ type: 'danger', message: 'Passwords do not match' });
      return;
    }

    const data = {
      // username,
      password,
      fname,
      lname,
      dob,
      email,
    };

    try {
      const response = await fetch('http://localhost:5000/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        // alert('Registration successful');
        setAlert({ type: 'success', message: 'Registration successful' });
        navigation.navigate('Login');
      } else {
        // Alert.alert('Registration failed: ' + (await response.json()).message);
        setAlert({ type: 'danger', message: (await response.json()).message });
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
            <h1 className="h3 mb-3 font-weight-normal">Register</h1>
          </div>
          {alert && (
            <div className={`alert alert-${alert.type} mb-3`} role="alert">
              {alert.message}
            </div>
          )}
          <Form>
            <Form.Group controlId="formFirstName">
              <Form.Label>First Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="First Name"
                value={fname}
                onChange={(e) => setFname(e.target.value)}
              />
            </Form.Group>

            <Form.Group controlId="formLastName">
              <Form.Label>Last Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Last Name"
                value={lname}
                onChange={(e) => setLname(e.target.value)}
              />
            </Form.Group>

            <Form.Group controlId="formDob">
              <Form.Label>Date of Birth</Form.Label>
              <Form.Control
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </Form.Group>

            <Form.Group controlId="formEmail">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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

            <Form.Group controlId="formConfirmPassword">
              <Form.Label>Confirm Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Form.Group>

            <Button variant="primary" type="button" onClick={handleRegister} className="w-100 mt-2">
              Register
            </Button>

            <Button variant="link" type="button" onClick={() => navigation.navigate('Login')} className="w-100">
              Already have an account? Login
            </Button>
          </Form>
        </Col>
      </Row>
    </Container>
  );
}