import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors } from '../../shared/theme';

import { generateChallenge } from './generateChallenge';

export interface ParentalGateScreenProps {
  /** Called once the challenge is answered correctly. */
  onSuccess: () => void;
}

export function ParentalGateScreen({ onSuccess }: ParentalGateScreenProps) {
  const [challenge, setChallenge] = useState(() => generateChallenge());
  const [answer, setAnswer] = useState('');
  const [wasWrong, setWasWrong] = useState(false);

  function check() {
    if (Number(answer) === challenge.answer) {
      onSuccess();
      return;
    }
    setWasWrong(true);
    setChallenge(generateChallenge());
    setAnswer('');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Quick check for grown-ups</Text>
      <Text style={styles.instructions}>Solve this to continue:</Text>
      <Text style={styles.question}>{challenge.question}</Text>
      <TextInput
        style={styles.input}
        value={answer}
        onChangeText={(text) => {
          setAnswer(text);
          setWasWrong(false);
        }}
        keyboardType="number-pad"
        placeholder="?"
        placeholderTextColor={Colors.neutralMuted}
        autoFocus
      />
      {wasWrong && <Text style={styles.error}>Not quite — try this one instead.</Text>}
      <Pressable style={styles.button} onPress={check} disabled={answer.length === 0}>
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: Colors.neutralMuted,
  },
  instructions: {
    fontSize: 16,
    color: Colors.neutralText,
    marginBottom: 8,
  },
  question: {
    fontSize: 40,
    fontWeight: '700',
    color: Colors.ink,
    marginBottom: 16,
  },
  input: {
    width: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.neutralBg,
    backgroundColor: Colors.neutralBg,
    fontSize: 24,
    textAlign: 'center',
    paddingVertical: 10,
    color: Colors.ink,
  },
  error: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutralText,
    marginTop: 8,
  },
  button: {
    marginTop: 24,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: Colors.ink,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.paper,
  },
});
