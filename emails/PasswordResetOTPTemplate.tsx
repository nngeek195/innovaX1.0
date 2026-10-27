import { Body, Container, Head, Heading, Html, Img, Preview, Section, Text, Hr } from '@react-email/components';
import * as React from 'react';

interface PasswordResetOTPTemplateProps {
  otp: string;
  email: string;
}

export const PasswordResetOTPTemplate = ({ otp, email }: PasswordResetOTPTemplateProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your InnovaX Password Reset Code: {otp}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img src="https://github.com/nngeek195/mywork/blob/b1/Header.png?raw=true" width="150" alt="InnovaX Logo" style={logo} />
          </Section>
          <Section style={content}>
            <Heading style={heading}>PASSWORD RESET</Heading>
            <Text style={text}>Agent <strong>{email}</strong>,</Text>
            <Text style={text}>
              A request has been made to reset the password for your InnovaX account. Use the security code below to proceed with the reset:
            </Text>
            
            <div style={otpContainer}>
              <Text style={otpText}>{otp}</Text>
            </div>

            <Text style={text}>
              <em>This code is valid for 10 minutes. Do not share it with anyone.</em>
            </Text>
            <Text style={warningText}>
              If you did not request a password reset, please ignore this email. Your account remains secure.
            </Text>
          </Section>
          <Hr style={divider} />
          <Section style={footer}>
            <Text style={footerText}>IEEE Computer Society · SUSL Chapter</Text>
            <Text style={footerText}>© InnovaX 2026. All Rights Reserved.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = { backgroundColor: '#05080C', fontFamily: 'monospace, sans-serif' };
const container = { margin: '0 auto', padding: '20px 0 48px', width: '580px' };
const header = { padding: '24px', textAlign: 'center' as const };
const logo = { margin: '0 auto' };
const content = { backgroundColor: '#121822', padding: '32px', borderRadius: '8px', border: '1px solid #FF6B35' };
const heading = { fontSize: '22px', color: '#ffffff', fontWeight: 'bold', marginBottom: '24px', textTransform: 'uppercase' as const, textAlign: 'center' as const };
const text = { color: '#a0aec0', fontSize: '14px', lineHeight: '24px', marginBottom: '16px' };
const warningText = { color: '#FF6B35', fontSize: '12px', lineHeight: '20px', marginBottom: '16px', fontStyle: 'italic' as const };
const otpContainer = { backgroundColor: '#05080C', border: '1px dashed #FF6B35', padding: '20px', textAlign: 'center' as const, margin: '24px 0', borderRadius: '4px' };
const otpText = { color: '#FF6B35', fontSize: '32px', fontWeight: 'bold', letterSpacing: '8px', margin: '0' };
const divider = { borderColor: '#1a2233', margin: '32px 0' };
const footer = { textAlign: 'center' as const };
const footerText = { color: '#4a5568', fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '2px', margin: '4px 0' };
