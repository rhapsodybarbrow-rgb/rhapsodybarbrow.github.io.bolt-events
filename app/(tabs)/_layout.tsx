import { Tabs } from "expo-router";
import { Users, QrCode, Scan, Settings, Home } from "lucide-react-native";
import React from "react";
import { Platform, Dimensions } from "react-native";

export default function TabLayout() {
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#6cace4",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e5e7eb",
          borderTopWidth: 1,
          ...(Platform.OS === 'web' && isTablet && {
            maxWidth: 600,
            alignSelf: 'center',
            borderRadius: 12,
            marginHorizontal: 20,
            marginBottom: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }),
        },
        headerStyle: {
          backgroundColor: "#6cace4",
        },
        headerTintColor: "#ffffff",
        headerTitleStyle: {
          fontWeight: "600" as const,
        },
      }}
    >
      <Tabs.Screen
        name="events"
        options={{
          title: "Bolt Events",
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: "Students",
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: "Tickets",
          tabBarIcon: ({ color }) => <QrCode size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: "Scanner",
          tabBarIcon: ({ color }) => <Scan size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}