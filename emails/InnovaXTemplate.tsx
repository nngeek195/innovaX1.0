import { Body, Container, Head, Heading, Html, Img, Preview, Section, Text, Link, Hr } from '@react-email/components';
import * as React from 'react';

interface InnovaXEmailProps {
  teamName: string;
  phase: 1 | 2;
}

export const InnovaXEmail = ({ teamName, phase }: InnovaXEmailProps) => {
  const isPhase1 = phase === 1;

  // Dynamic Content based on Phase
  const title = isPhase1 ? "Phase 1 Cleared: Round 2 Bound" : "Prototype Verified: Semi-Finalist Status";
  const previewText = isPhase1
    ? "Congratulations! You have been selected for the next round of InnovaX."
    : "Congratulations! You are officially an InnovaX Semi-Finalist.";

  // Theming: Cyan for Phase 1, Gold for Phase 2
  const themeColor = isPhase1 ? '#00E5FF' : '#FFD700'; 
  const themeBg = isPhase1 ? 'rgba(0, 229, 255, 0.05)' : 'rgba(255, 215, 0, 0.05)';

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
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
              SYSTEM UPDATE: <br />
              <span style={{ color: themeColor, fontSize: '24px' }}>{title}</span>
            </Heading>
            
            <Text style={text}>Explorer <strong>{teamName}</strong>,</Text>

            {isPhase1 ? (
              <>
                <Text style={text}>
                  <strong>Congratulations!</strong> Your architecture proposal has successfully passed our expert evaluation panel.
                </Text>
                <Text style={text}>
                  You have been officially selected to advance to <strong>Round 2</strong>. Phase 2 (Prototype & Pitch) is now unlocked on your command dashboard.
                </Text>
                
                {/* Highlight Box for Important Info */}
                <Section style={{ ...highlightBox, borderLeftColor: themeColor, backgroundColor: themeBg }}>
                  <Text style={highlightText}>
                    More information regarding the next steps will be provided soon. Please keep in touch and actively monitor our official communication groups for upcoming announcements.
                  </Text>
                </Section>
              </>
            ) : (
              <>
                <Text style={text}>
                  <strong>Congratulations!</strong> Your prototype and pitch video have been thoroughly evaluated and verified by our judging panel.
                </Text>
                <Text style={text}>
                  It is our absolute privilege to inform you that you have been officially selected as an <strong>InnovaX Semi-Finalist</strong>.
                </Text>
                
                {/* Highlight Box for Important Info */}
                <Section style={{ ...highlightBox, borderLeftColor: themeColor, backgroundColor: themeBg }}>
                  <Text style={highlightText}>
                    Prepare your systems for the final deployment. We look forward to seeing you at the Sabaragamuwa University of Sri Lanka for the live showdown!
                  </Text>
                </Section>
              </>
            )}

            <Section style={buttonContainer}>
              <Link href="https://your-domain.com/dashboard" style={{ ...button, backgroundColor: themeColor }}>
                ACCESS COMMAND DASHBOARD
              </Link>
            </Section>
          </Section>

          {/* Footer matching your site */}
          <Hr style={divider} />
          <Section style={footer}>
            <Text style={footerText}>
              IEEE Computer Society · SUSL Chapter<br />
              Sabaragamuwa University of Sri Lanka
            </Text>
            <Text style={footerLinks}>
              <Link href="mailto:innovax.susl@gmail.com" style={link}>innovax.susl@gmail.com</Link> • <Link href="mailto:ssomaweera@foc.sab.ac.lk" style={link}>ssomaweera@foc.sab.ac.lk</Link>
            </Text>
            <Text style={footerText}>© InnovaX 2026. All Rights Reserved.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles for standard email clients
const main = { backgroundColor: '#05080C', fontFamily: 'monospace, sans-serif' };
const container = { margin: '0 auto', padding: '20px 0 48px', width: '580px' };
const header = { padding: '32px 24px', textAlign: 'center' as const };
const logo = { margin: '0 auto' };
const content = { backgroundColor: '#121822', padding: '40px 32px', borderRadius: '8px', border: '1px solid', borderTopWidth: '4px' };
const heading = { fontSize: '18px', color: '#ffffff', fontWeight: 'bold', marginBottom: '32px', textTransform: 'uppercase' as const, textAlign: 'center' as const, lineHeight: '1.4' };
const text = { color: '#a0aec0', fontSize: '15px', lineHeight: '26px', marginBottom: '16px' };
const highlightBox = { padding: '16px 20px', marginTop: '28px', borderRadius: '0 8px 8px 0', borderLeftStyle: 'solid' as const, borderLeftWidth: '4px' };
const highlightText = { color: '#e2e8f0', fontSize: '14px', lineHeight: '24px', margin: '0' };
const buttonContainer = { textAlign: 'center' as const, marginTop: '40px' };
const button = { color: '#05080C', padding: '16px 32px', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold', display: 'inline-block', fontSize: '14px', letterSpacing: '1px' };
const divider = { borderColor: '#1a2233', margin: '40px 0' };
const footer = { textAlign: 'center' as const };
const footerText = { color: '#4a5568', fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '2px', margin: '6px 0', lineHeight: '18px' };
const footerLinks = { margin: '16px 0' };
const link = { color: '#00E5FF', textDecoration: 'none', fontSize: '11px', fontWeight: 'bold' };