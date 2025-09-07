import React from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { QrCode, Calendar, Hash } from "lucide-react-native";
import { router } from "expo-router";
import { useStudents } from "@/hooks/useStudents";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TicketsScreen() {
  const insets = useSafeAreaInsets();
  const { students } = useStudents();
  const studentsWithTickets = students.filter((s) => s.hasTicket);

  // Create individual ticket items for display
  const ticketItems = studentsWithTickets.flatMap((student) => {
    const ticketNumbers = student.ticketNumbers || [student.ticketNumber || ''];
    return ticketNumbers.map((ticketNumber, index) => ({
      ...student,
      ticketNumber,
      ticketIndex: index,
      isGuestTicket: index > 0 && student.guestName,
      displayId: `${student.id}_${index}`,
    }));
  });

  const renderTicket = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.ticketCard}
      onPress={() => router.push(`/ticket/${item.id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.ticketHeader}>
        <View style={styles.ticketHeaderLeft}>
          <Text style={styles.eventName}>Annual Student Event 2025</Text>
          <Text style={styles.ticketType}>
            {item.isGuestTicket ? 'Guest Admission' : 'General Admission'}
            {item.ticketCount && item.ticketCount > 1 && ` (${item.ticketIndex + 1}/${item.ticketCount})`}
          </Text>
        </View>
        <QrCode size={40} color="#6cace4" />
      </View>
      
      <View style={styles.ticketDivider}>
        <View style={styles.dividerCircleLeft} />
        <View style={styles.dividerLine} />
        <View style={styles.dividerCircleRight} />
      </View>
      
      <View style={styles.ticketBody}>
        <Text style={styles.studentName}>
          {item.isGuestTicket && item.guestName ? item.guestName : item.name}
        </Text>
        {item.isGuestTicket && item.guestSchool && (
          <Text style={styles.guestSchool}>{item.guestSchool}</Text>
        )}
        {item.isGuestTicket && (
          <Text style={styles.guestLabel}>Guest of {item.name}</Text>
        )}
        <View style={styles.ticketDetails}>
          <View style={styles.detailItem}>
            <Hash size={14} color="#6b7280" />
            <Text style={styles.detailText}>{item.ticketNumber}</Text>
          </View>
          <View style={styles.detailItem}>
            <Calendar size={14} color="#6b7280" />
            <Text style={styles.detailText}>Jan 15, 2025</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (ticketItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <QrCode size={64} color="#d1d5db" />
        <Text style={styles.emptyTitle}>No Tickets Yet</Text>
        <Text style={styles.emptyText}>
          Generate tickets from the Students tab
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={ticketItems}
        renderItem={renderTicket}
        keyExtractor={(item) => item.displayId}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  listContent: {
    padding: 16,
  },
  ticketCard: {
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#e6f3ff",
  },
  ticketHeaderLeft: {
    flex: 1,
  },
  eventName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6cace4",
    marginBottom: 4,
  },
  ticketType: {
    fontSize: 12,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  ticketDivider: {
    flexDirection: "row",
    alignItems: "center",
    height: 0,
  },
  dividerCircleLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    marginLeft: -10,
  },
  dividerCircleRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    marginRight: -10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  ticketBody: {
    padding: 20,
  },
  studentName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
  },
  ticketDetails: {
    flexDirection: "row",
    gap: 20,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: "#6b7280",
  },
  separator: {
    height: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#4b5563",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#9ca3af",
    textAlign: "center",
  },
  guestSchool: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  guestLabel: {
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic",
    marginBottom: 8,
  },
});