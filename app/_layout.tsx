import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StudentProvider } from "@/hooks/useStudents";
import { EventProvider } from "@/hooks/useEvent";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="ticket/[id]" 
        options={{ 
          presentation: "modal",
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="shared/[shareCode]" 
        options={{ 
          headerShown: false,
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
    
    // Web-specific optimizations for iPhone/iPad
    if (Platform.OS === 'web') {
      // Prevent zoom on input focus (iOS Safari)
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
      }
      
      // Add iOS-specific meta tags for web app behavior
      const head = document.head;
      
      // Apple mobile web app capable
      const appleCapable = document.createElement('meta');
      appleCapable.name = 'apple-mobile-web-app-capable';
      appleCapable.content = 'yes';
      head.appendChild(appleCapable);
      
      // Apple status bar style
      const statusBar = document.createElement('meta');
      statusBar.name = 'apple-mobile-web-app-status-bar-style';
      statusBar.content = 'default';
      head.appendChild(statusBar);
      
      // Apple mobile web app title
      const appTitle = document.createElement('meta');
      appTitle.name = 'apple-mobile-web-app-title';
      appTitle.content = 'Bolt Events';
      head.appendChild(appTitle);
      
      // Theme color for browser UI
      const themeColor = document.createElement('meta');
      themeColor.name = 'theme-color';
      themeColor.content = '#6cace4';
      head.appendChild(themeColor);
      
      // Prevent text size adjustment on iOS
      document.body.style.webkitTextSizeAdjust = '100%';
      (document.body.style as any).textSizeAdjust = '100%';
      
      // Improve touch responsiveness
      document.body.style.touchAction = 'manipulation';
    }
  }, []);

  const GestureWrapper = Platform.OS === 'web' ? 
    ({ children }: { children: React.ReactNode }) => <>{children}</> : 
    GestureHandlerRootView;

  return (
    <QueryClientProvider client={queryClient}>
      <EventProvider>
        <StudentProvider>
          <GestureWrapper style={Platform.OS === 'web' ? undefined : { flex: 1 }}>
            <RootLayoutNav />
          </GestureWrapper>
        </StudentProvider>
      </EventProvider>
    </QueryClientProvider>
  );
}