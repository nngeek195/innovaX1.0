import { Body, Container, Head, Heading, Html, Img, Preview, Section, Text, Link, Hr } from '@react-email/components';
import * as React from 'react';
import { CONTACT_EMAIL_ADVISOR, CONTACT_EMAIL_GENERAL } from '@/lib/config';

interface JudgeAssignmentEmailProps {
  judgeName: string;
  proposalCount: number;
  dashboardUrl: string;
}

export const JudgeAssignmentEmail = ({ judgeName, proposalCount, dashboardUrl }: JudgeAssignmentEmailProps) => {
  const plural = proposalCount === 1 ? '' : 's';
  return (
    <Html>
      <Head />
      <Preview>{`${proposalCount} InnovaX proposal${plural} are now waiting on your Judge Board dashboard.`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img src="https://github.com/nngeek195/mywork/blob/b1/Header.png?raw=true" width="220" alt="InnovaX Logo" style={logo} />
          </Section>

          <Section style={content}>
            <Heading style={heading}>
              JUDGE BOARD UPDATE: <br />
              <span style={{ color: '#00E5FF', fontSize: '24px' }}>Proposals Are Ready For Review</span>
            </Heading>

            <Text style={text}>Dear <strong>{judgeName}</strong>,</Text>
            <Text style={text}>
              Thank you for serving on the InnovaX Judge Board. The Phase 1 proposals have now been distributed among the judges,
              and <strong>{proposalCount} proposal{plural}</strong> {proposalCount === 1 ? 'has' : 'have'} been assigned to you.
            </Text>

            <Section style={highlightBox}>
              <Text style={highlightText}>
                Sign in to your Judge Board dashboard to read each proposal and record your score using the evaluation rubric.
                Your scores are saved instantly and you can revise them at any time before the evaluation closes.
              </Text>
            </Section>

            <Section style={buttonContainer}>
              <Link href={dashboardUrl} style={button}>OPEN JUDGE DASHBOARD</Link>
            </Section>
          </Section>

          <Hr style={divider} />
          <Section style={footer}>
            <Text style={footerText}>
              IEEE Computer Society · SUSL Chapter<br />
              Sabaragamuwa University of Sri Lanka
            </Text>
            <Text style={footerLinks}>
              <Link href={`mailto:${CONTACT_EMAIL_GENERAL}`} style={link}>{CONTACT_EMAIL_GENERAL}</Link> • <Link href={`mailto:${CONTACT_EMAIL_ADVISOR}`} style={link}>{CONTACT_EMAIL_ADVISOR}</Link>
            </Text>
            <Text style={footerText}>© InnovaX 2026. All Rights Reserved.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const main = { backgroundColor: '#05080C', fontFamily: 'monospace, sans-serif' };
const container = { margin: '0 auto', padding: '20px 0 48px', width: '580px' };
const header = { padding: '32px 24px', textAlign: 'center' as const };
const logo = { margin: '0 auto' };
const content = { backgroundColor: '#121822', padding: '40px 32px', borderRadius: '8px', border: '1px solid #00E5FF', borderTopWidth: '4px' };
const heading = { fontSize: '18px', color: '#ffffff', fontWeight: 'bold', marginBottom: '32px', textTransform: 'uppercase' as const, textAlign: 'center' as const, lineHeight: '1.4' };
const text = { color: '#a0aec0', fontSize: '15px', lineHeight: '26px', marginBottom: '16px' };
const highlightBox = { padding: '16px 20px', marginTop: '28px', borderRadius: '0 8px 8px 0', borderLeft: '4px solid #00E5FF', backgroundColor: 'rgba(0, 229, 255, 0.05)' };
const highlightText = { color: '#e2e8f0', fontSize: '14px', lineHeight: '24px', margin: '0' };
const buttonContainer = { textAlign: 'center' as const, marginTop: '40px' };
const button = { backgroundColor: '#00E5FF', color: '#05080C', padding: '16px 32px', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold', display: 'inline-block', fontSize: '14px', letterSpacing: '1px' };
const divider = { borderColor: '#1a2233', margin: '40px 0' };
const footer = { textAlign: 'center' as const };
const footerText = { color: '#4a5568', fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '2px', margin: '6px 0', lineHeight: '18px' };
const footerLinks = { margin: '16px 0' };
const link = { color: '#00E5FF', textDecoration: 'none', fontSize: '12px' };
