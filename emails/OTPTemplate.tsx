import { Body, Container, Head, Heading, Html, Img, Preview, Section, Text, Hr } from '@react-email/components';
import * as React from 'react';

interface OTPTemplateProps {
  otp: string;
  name: string;
  /** 'judge' tailors the copy for Judge Board registration */
  audience?: 'participant' | 'judge';
}

export const OTPTemplate = ({ otp, name, audience = 'participant' }: OTPTemplateProps) => {
  const isJudge = audience === 'judge';
  return (
    <Html>
      <Head />
      <Preview>{isJudge ? 'Your InnovaX Judge Board Verification Code' : 'Your InnovaX Registration Access Code'}: {otp}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img src="https://github.com/nngeek195/mywork/blob/b1/Header.png?raw=true" width="150" alt="InnovaX Logo" style={logo} />
          </Section>
          <Section style={content}>
            <Heading style={heading}>SYSTEM VERIFICATION</Heading>
            <Text style={text}>{isJudge ? 'Dear' : 'Explorer'} <strong>{name}</strong>,</Text>
            <Text style={text}>
              {isJudge
                ? 'Thank you for registering to serve on the InnovaX Judge Board. To verify your email address and activate your judge portal access, please use the verification code below:'
                : 'A request has been made to register this email address for the InnovaX Hackathon. To verify your identity and secure your portal access, use the clearance code below:'}
            </Text>
            
            <div style={otpContainer}>
              <Text style={otpText}>{otp}</Text>
            </div>

            <Text style={text}>
              <em>This code is valid for 10 minutes. Do not share it with anyone.</em>
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
const content = { backgroundColor: '#121822', padding: '32px', borderRadius: '8px', border: '1px solid #00E5FF' };
const heading = { fontSize: '22px', color: '#ffffff', fontWeight: 'bold', marginBottom: '24px', textTransform: 'uppercase' as const, textAlign: 'center' as const };
const text = { color: '#a0aec0', fontSize: '14px', lineHeight: '24px', marginBottom: '16px' };
const otpContainer = { backgroundColor: '#05080C', border: '1px dashed #00E5FF', padding: '20px', textAlign: 'center' as const, margin: '24px 0', borderRadius: '4px' };
const otpText = { color: '#00E5FF', fontSize: '32px', fontWeight: 'bold', letterSpacing: '8px', margin: '0' };
const divider = { borderColor: '#1a2233', margin: '32px 0' };
const footer = { textAlign: 'center' as const };
const footerText = { color: '#4a5568', fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '2px', margin: '4px 0' };