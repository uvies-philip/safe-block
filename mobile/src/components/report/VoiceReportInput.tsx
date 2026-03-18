import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../../utils/theme';

type Props = {
  onTranscript: (text: string) => void;
};

export const VoiceReportInput = ({ onTranscript }: Props) => {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupported = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    const speech = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return Boolean(speech);
  }, []);

  const startListening = () => {
    setError(null);

    if (!isSupported || typeof window === 'undefined') {
      setError('Voice-to-text is available on web preview browsers.');
      return;
    }

    const SpeechCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechCtor();
    recognition.lang = 'en-NG';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onerror = () => {
      setListening(false);
      setError('Voice capture failed. Please type your report.');
    };
    recognition.onend = () => setListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? '';
      if (transcript.trim().length > 0) {
        onTranscript(transcript.trim());
      }
    };

    recognition.start();
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={startListening} style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}>
        <Text style={styles.icon}>🎙</Text>
        <Text style={styles.label}>{listening ? 'Listening…' : 'Voice to text'}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  button: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 46,
  },
  buttonPressed: {
    opacity: 0.86,
  },
  icon: {
    fontSize: 16,
  },
  label: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  error: {
    color: theme.colors.warning,
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
});
