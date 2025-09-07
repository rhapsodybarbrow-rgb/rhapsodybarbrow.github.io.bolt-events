import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { Mail, Download, Share2, ArrowLeft, Wallet } from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { useStudents } from "@/hooks/useStudents";
import { useEvent } from "@/hooks/useEvent";
import { Student } from "@/types/student";
import { saveToWallet } from "@/utils/walletService";

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams();
  const { students } = useStudents();
  const { currentEvent } = useEvent();
  const [student, setStudent] = useState<Student | null>(null);

  useEffect(() => {
    const foundStudent = students.find(s => s.id === id);
    if (foundStudent && foundStudent.hasTicket) {
      setStudent(foundStudent);
    }
  }, [id, students]);

  const handleEmail = () => {
    const ticketCount = student?.ticketCount || 1;
    const ticketText = ticketCount > 1 ? `${ticketCount} tickets have` : 'Ticket has';
    Alert.alert(
      "Email Sent",
      `${ticketText} been emailed to ${student?.email}`,
      [{ text: "OK" }]
    );
  };

  const handleDownload = () => {
    Alert.alert(
      "Downloaded",
      "Ticket has been saved to your device",
      [{ text: "OK" }]
    );
  };

  const handleShare = () => {
    Alert.alert(
      "Share Ticket",
      "Choose how you want to share this ticket",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Share", onPress: () => console.log("Sharing...") }
      ]
    );
  };

  const handleSaveToWallet = async () => {
    if (!student) return;
    
    try {
      const result = await saveToWallet({
        studentId: student.id,
        name: student.name,
        email: student.email,
        studentIdNumber: student.studentId,
        ticketNumber: student.ticketNumber || '',
        ticketNumbers: student.ticketNumbers || [],
        ticketCount: student.ticketCount || 1,
        guestName: student.guestName,
        guestSchool: student.guestSchool,
        eventTitle: currentEvent?.name || "School Event",
        eventDate: formatEventDate(currentEvent?.date, currentEvent?.time),
        eventLocation: currentEvent?.location || "Event Location",
        qrData
      });
      
      if (result.success) {
        Alert.alert(
          "Success",
          `Ticket${student.ticketCount && student.ticketCount > 1 ? 's' : ''} saved to ${result.walletType} successfully!`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert(
          "Error",
          result.error || "Failed to save ticket to wallet",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error('Wallet save error:', error);
      Alert.alert(
        "Error",
        "An unexpected error occurred while saving to wallet",
        [{ text: "OK" }]
      );
    }
  };

  const formatEventDate = (date?: string, time?: string) => {
    if (!date) return "Event Date TBD";
    try {
      const eventDate = new Date(date);
      const dateStr = eventDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      
      if (time) {
        const timeStr = formatEventTime(time);
        return `${dateStr} at ${timeStr}`;
      }
      return dateStr;
    } catch {
      return date;
    }
  };

  const formatEventTime = (time?: string) => {
    if (!time) return "6:00 PM";
    try {
      const [hours, minutes] = time.split(":");
      const date = new Date();
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return time;
    }
  };

  if (!student) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6cace4" />
        <Text style={styles.loadingText}>Loading ticket...</Text>
      </View>
    );
  }

  const qrData = JSON.stringify({
    id: student.id,
    ticketNumber: student.ticketNumber,
    name: student.name,
    studentId: student.studentId,
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: "Ticket Details",
          headerStyle: { backgroundColor: "#6cace4" },
          headerTintColor: "#ffffff",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
              <ArrowLeft size={24} color="#ffffff" />
            </TouchableOpacity>
          ),
        }}
      />
      
      <ScrollView style={styles.container}>
        <View style={styles.ticketContainer}>
          <View style={styles.ticketHeader}>
            {currentEvent?.imageUrl && (
              <Image
                source={{ uri: currentEvent.imageUrl }}
                style={styles.eventImage}
                resizeMode="cover"
              />
            )}
            <Text style={styles.eventTitle}>{currentEvent?.name || "School Event"}</Text>
            <Text style={styles.eventDate}>{formatEventDate(currentEvent?.date, currentEvent?.time)}</Text>
            {currentEvent?.location && (
              <Text style={styles.eventLocation}>{currentEvent.location}</Text>
            )}
          </View>

          <View style={styles.qrContainer}>
            <QRCode
              value={qrData}
              size={200}
              backgroundColor="#ffffff"
              color="#1f2937"
            />
            <Text style={styles.ticketNumber}>#{student.ticketNumber}</Text>
          </View>

          <View style={styles.ticketInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{student.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Student ID</Text>
              <Text style={styles.infoValue}>{student.studentId}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{student.email}</Text>
            </View>
            {student.ticketCount && student.ticketCount > 1 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Tickets</Text>
                <Text style={styles.infoValue}>{student.ticketCount}</Text>
              </View>
            )}
            {student.ticketNumbers && student.ticketNumbers.length > 1 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>All Ticket Numbers</Text>
                <View style={styles.ticketNumbersList}>
                  {student.ticketNumbers.map((ticketNum, index) => (
                    <Text key={ticketNum} style={styles.ticketNumberItem}>
                      #{ticketNum}
                    </Text>
                  ))}
                </View>
              </View>
            )}
            {student.guestName && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Guest Name</Text>
                <Text style={styles.infoValue}>{student.guestName}</Text>
              </View>
            )}
            {student.guestSchool && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Guest School</Text>
                <Text style={styles.infoValue}>{student.guestSchool}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ticket Type</Text>
              <Text style={styles.infoValue}>General Admission</Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={handleEmail}>
              <Mail size={20} color="#6cace4" />
              <Text style={styles.actionButtonText}>Email</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={handleDownload}>
              <Download size={20} color="#6cace4" />
              <Text style={styles.actionButtonText}>Download</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={handleSaveToWallet}>
              <Wallet size={20} color="#6cace4" />
              <Text style={styles.actionButtonText}>Add to Wallet</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Share2 size={20} color="#6cace4" />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>
          </View>

          {(currentEvent?.instructions || currentEvent?.directions) && (
            <View style={styles.instructions}>
              {currentEvent?.instructions && (
                <>
                  <Text style={styles.instructionsTitle}>Instructions</Text>
                  <Text style={styles.instructionsText}>
                    {currentEvent.instructions}
                    {student.ticketCount && student.ticketCount > 1 
                      ? `\n• You have ${student.ticketCount} tickets - all have been emailed to you`
                      : ''
                    }
                    {student.guestName && `\n• Guest ticket is included for ${student.guestName}`}
                  </Text>
                </>
              )}
              
              {currentEvent?.directions && (
                <>
                  <Text style={[styles.instructionsTitle, currentEvent?.instructions && { marginTop: 16 }]}>Directions</Text>
                  <Text style={styles.instructionsText}>
                    {currentEvent.directions}
                  </Text>
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6b7280",
  },
  ticketContainer: {
    margin: 16,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  ticketHeader: {
    backgroundColor: "#e6f3ff",
    padding: 20,
    alignItems: "center",
  },
  eventImage: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    marginBottom: 16,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#6cace4",
    marginBottom: 8,
    textAlign: "center",
  },
  eventDate: {
    fontSize: 16,
    color: "#4b5563",
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: "#6b7280",
  },
  qrContainer: {
    alignItems: "center",
    padding: 32,
    backgroundColor: "#ffffff",
  },
  ticketNumber: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginTop: 16,
  },
  ticketInfo: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
    textAlign: "right",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    flexWrap: "wrap",
  },
  actionButton: {
    alignItems: "center",
    padding: 12,
    minWidth: "22%",
  },
  actionButtonText: {
    fontSize: 12,
    color: "#6cace4",
    marginTop: 4,
    fontWeight: "500",
  },
  instructions: {
    padding: 20,
    backgroundColor: "#f9fafb",
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  ticketNumbersList: {
    flex: 1,
    alignItems: "flex-end",
  },
  ticketNumberItem: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
});