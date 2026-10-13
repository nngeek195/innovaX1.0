import { Body, Container, Head, Heading, Html, Img, Preview, Section, Text, Link, Hr } from '@react-email/components';
import * as React from 'react';

interface AmbassadorEmailProps {
  name: string;
  ambassadorId: string;
  university?: string;
  siteUrl?: string;
  referralLink?: string;
}

export const AmbassadorEmail = ({
  name,
  ambassadorId,
  university,
  siteUrl = 'https://innovax.cschaptersusl.org',
  referralLink,
}: AmbassadorEmailProps) => {
  const themeColor = '#00E5FF';
  const themeBg = 'rgba(0, 229, 255, 0.05)';
  const activeReferralLink = referralLink || `${siteUrl}/register?ref=${encodeURIComponent(ambassadorId)}`;

  return (
    <Html>
      <Head />
      <Preview>InnovaX 2026: Campus Ambassador Clearance &amp; Referral Code: {ambassadorId}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with Logo */}
          <Section style={header}>
            <Img
              src="https://github.com/nngeek195/mywork/blob/b1/Header.png?raw=true"
              width="220"
              alt="InnovaX Logo"
              style={logo}
            />
          </Section>

          {/* Body Content */}
          <Section style={{ ...content, borderColor: themeColor }}>
            <Heading style={heading}>
              CREDENTIAL CLEARANCE: <br />
              <span style={{ color: themeColor, fontSize: '22px' }}>CAMPUS AMBASSADOR APPOINTMENT</span>
            </Heading>

            <Text style={text}>
              Greetings Ambassador <strong>{name}</strong>,
            </Text>

            <Text style={text}>
              Congratulations! You have been officially appointed as an authorized{' '}
              <strong>InnovaX 2026 Campus Ambassador</strong>
              {university ? <> representing <strong>{university}</strong></> : null}.
            </Text>

            <Text style={text}>
              As an ambassador, you are the frontline bridge connecting visionary minds at your institution to the InnovaX Hackathon ecosystem.
            </Text>

            {/* Ambassador Code Box */}
            <Section style={codeBoxContainer}>
              <Text style={codeLabel}>YOUR UNIQUE AMBASSADOR CODE</Text>
              <Text style={codeText}>{ambassadorId}</Text>
            </Section>

            {/* Highlight Box for Instructions */}
            <Section style={{ ...highlightBox, borderLeftColor: themeColor, backgroundColor: themeBg }}>
              <Text style={highlightTitle}>DELEGATE REGISTRATION PROTOCOL</Text>
              <Text style={highlightText}>
                Share your unique ambassador code and referral link with delegates and hackathon teams from your university. When teams register using your code, their registrations will be attributed directly to your profile.
              </Text>
            </Section>

            {/* Referral Link Box */}
            <Section style={linkSection}>
              <Text style={linkLabel}>OFFICIAL REGISTRATION LINK:</Text>
              <Link href={activeReferralLink} style={referralLinkStyle}>
                {activeReferralLink}
              </Link>
            </Section>

            <Section style={buttonContainer}>
              <Link href={activeReferralLink} style={{ ...button, backgroundColor: themeColor }}>
                OPEN REGISTRATION PORTAL
              </Link>
            </Section>

            <Text style={{ ...text, marginTop: '32px', fontSize: '13px', color: '#718096' }}>
              If you have any questions or require promotional materials, please do not hesitate to reach out to our organizing committee.
            </Text>
          </Section>

          {/* Footer matching your site */}
          <Hr style={divider} />
          <Section style={footer}>
            <Text style={footerText}>
              IEEE Computer Society · SUSL Chapter<br />
              Sabaragamuwa University of Sri Lanka
            </Text>
            <Text style={footerLinks}>
              <Link href="mailto:ieeecschaptersusl@gmail.com" style={link}>ieeecschaptersusl@gmail.com</Link> •{' '}
              <Link href="mailto:ssomaweera@foc.sab.ac.lk" style={link}>ssomaweera@foc.sab.ac.lk</Link>
            </Text>
            <Text style={footerText}>© InnovaX 2026. All Rights Reserved.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default AmbassadorEmail;

// Styles
const main = { backgroundColor: '#05080C', fontFamily: 'monospace, sans-serif' };
const container = { margin: '0 auto', padding: '20px 0 48px', width: '580px' };
const header = { padding: '32px 24px', textAlign: 'center' as const };
const logo = { margin: '0 auto' };
const content = {
  backgroundColor: '#121822',
  padding: '40px 32px',
  borderRadius: '8px',
  border: '1px solid',
  borderTopWidth: '4px',
};
const heading = {
  fontSize: '18px',
  color: '#ffffff',
  fontWeight: 'bold',
  marginBottom: '32px',
  textTransform: 'uppercase' as const,
  textAlign: 'center' as const,
  lineHeight: '1.4',
};
const text = { color: '#a0aec0', fontSize: '15px', lineHeight: '26px', marginBottom: '16px' };

const codeBoxContainer = {
  backgroundColor: '#05080C',
  border: '1px dashed #00E5FF',
  padding: '20px',
  textAlign: 'center' as const,
  margin: '28px 0',
  borderRadius: '6px',
};
const codeLabel = {
  color: '#718096',
  fontSize: '11px',
  fontWeight: 'bold',
  letterSpacing: '2px',
  margin: '0 0 8px 0',
  textTransform: 'uppercase' as const,
};
const codeText = {
  color: '#00E5FF',
  fontSize: '32px',
  fontWeight: 'bold',
  letterSpacing: '6px',
  margin: '0',
  fontFamily: 'monospace',
};

const highlightBox = {
  padding: '16px 20px',
  marginTop: '20px',
  marginBottom: '20px',
  borderRadius: '0 8px 8px 0',
  borderLeftStyle: 'solid' as const,
  borderLeftWidth: '4px',
};
const highlightTitle = {
  color: '#00E5FF',
  fontSize: '12px',
  fontWeight: 'bold',
  letterSpacing: '1px',
  margin: '0 0 6px 0',
  textTransform: 'uppercase' as const,
};
const highlightText = { color: '#e2e8f0', fontSize: '13px', lineHeight: '22px', margin: '0' };

const linkSection = {
  backgroundColor: 'rgba(5, 8, 12, 0.7)',
  padding: '12px 16px',
  borderRadius: '4px',
  border: '1px solid #1a2233',
  marginTop: '16px',
  wordBreak: 'break-all' as const,
};
const linkLabel = {
  color: '#718096',
  fontSize: '10px',
  fontWeight: 'bold',
  letterSpacing: '1px',
  margin: '0 0 4px 0',
  textTransform: 'uppercase' as const,
};
const referralLinkStyle = {
  color: '#00E5FF',
  fontSize: '12px',
  textDecoration: 'none',
  fontWeight: 'bold',
};

const buttonContainer = { textAlign: 'center' as const, marginTop: '32px' };
const button = {
  color: '#05080C',
  padding: '16px 32px',
  borderRadius: '4px',
  textDecoration: 'none',
  fontWeight: 'bold',
  display: 'inline-block',
  fontSize: '13px',
  letterSpacing: '1.5px',
};
const divider = { borderColor: '#1a2233', margin: '40px 0' };
const footer = { textAlign: 'center' as const };
const footerText = {
  color: '#4a5568',
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '2px',
  margin: '6px 0',
  lineHeight: '18px',
};
const footerLinks = { margin: '16px 0' };
const link = { color: '#00E5FF', textDecoration: 'none', fontSize: '11px', fontWeight: 'bold' };
