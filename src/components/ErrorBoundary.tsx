import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { reportError } from '../lib/sentry';

interface Props {
  children: React.ReactNode;
}
interface State {
  error: Error | null;
}

// Fanger uventede render-/runtime-feil i navigatorene så appen viser en
// gjenopprettingsskjerm i stedet for å bli hvit/fryse. Fargene er statiske
// (ikke tema-avhengige) med vilje — hvis feilen ligger i tema-/store-laget skal
// denne skjermen fortsatt tegnes trygt.
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary fanget en feil:', error, info?.componentStack);
    reportError(error, { source: 'ErrorBoundary', componentStack: info?.componentStack });
  }

  handleReset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.title}>Noe gikk galt</Text>
          <Text style={styles.body}>
            Appen støtte på en uventet feil. Prøv igjen — er problemet vedvarende,
            last inn appen på nytt.
          </Text>
          <Text style={styles.detail} numberOfLines={4}>{this.state.error.message}</Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Prøv igjen</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  emoji: { fontSize: 44, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '700', color: '#000000' },
  body: { fontSize: 15, lineHeight: 22, color: '#616A76', textAlign: 'center', maxWidth: 420 },
  detail: {
    fontSize: 13,
    color: '#991B1B',
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: 440,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    backgroundColor: '#000000',
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 13,
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
