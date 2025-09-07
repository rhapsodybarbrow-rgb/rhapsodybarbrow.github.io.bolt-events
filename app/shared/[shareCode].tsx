import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useStudents } from '@/hooks/useStudents';

export default function SharedEventScreen() {
  const { shareCode } = useLocalSearchParams<{ shareCode: string }>();
  const { loadSharedEvent } = useStudents();
  const [isLoading, setIsLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const handleLoadSharedEvent = async () => {
      if (!shareCode) {
        Alert.alert('Error', 'No share code provided');
        router.back();
        return;
      }

      try {
        const result = await loadSharedEvent(shareCode);
        if (result.success) {
          Alert.alert(
            'Event Loaded Successfully',
            `Loaded shared event: ${result.event?.name}`,
            [
              {
                text: 'OK',
                onPress: () => router.replace('/(tabs)/events'),
              },
            ]
          );
        } else {
          Alert.alert(
            'Failed to Load Event',
            result.error || 'The shared event could not be loaded',
            [
              {
                text: 'OK',
                onPress: () => router.back(),
              },
            ]
          );
        }
      } catch {
        Alert.alert(
          'Error',
          'An unexpected error occurred while loading the shared event',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (shareCode) {
      handleLoadSharedEvent();
    }
  }, [shareCode, loadSharedEvent]);



  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <ActivityIndicator size="large" color="#6cace4" />
        <Text style={styles.loadingText}>Loading shared event...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Text style={styles.text}>Processing shared event...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  text: {
    fontSize: 16,
    color: '#6b7280',
  },
});