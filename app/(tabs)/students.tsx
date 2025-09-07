import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from "react-native";
import { Search, QrCode, CheckCircle, Upload, FileText, Download, AlertCircle } from "lucide-react-native";
import { router, Stack } from "expo-router";
import { useStudents } from "@/hooks/useStudents";
import { useEvent } from "@/hooks/useEvent";
import { Student } from "@/types/student";

export default function StudentsScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { students, generateTicket, isLoading, importStudentsFromSheets } = useStudents();
  const { currentEvent } = useEvent();

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    
    const query = searchQuery.toLowerCase();
    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query) ||
        student.studentId.toLowerCase().includes(query)
    );
  }, [students, searchQuery]);

  const handleGenerateTicket = async (student: Student) => {
    try {
      await generateTicket(student.id);
      const ticketCount = student.ticketCount || 1;
      const ticketText = ticketCount > 1 ? `${ticketCount} tickets` : 'Ticket';
      const emailText = ticketCount > 1 ? 'have been' : 'has been';
      
      Alert.alert(
        "Success",
        `${ticketText} generated and ${emailText} emailed to ${student.email}${student.guestName ? ` (including guest ticket for ${student.guestName})` : ''}`,
        [
          {
            text: "View Tickets",
            onPress: () => router.push(`/ticket/${student.id}`),
          },
          { text: "OK" },
        ]
      );
    } catch {
      Alert.alert("Error", "Failed to generate ticket. Please try again.");
    }
  };

  const handleImport = async () => {
    if (!sheetsUrl.trim()) {
      Alert.alert("Error", "Please enter a Google Sheets URL");
      return;
    }

    if (!isValidGoogleSheetsUrl(sheetsUrl)) {
      Alert.alert(
        "Invalid URL", 
        "Please enter a valid Google Sheets URL. Make sure the sheet is publicly accessible."
      );
      return;
    }

    setIsImporting(true);
    setImportStatus('idle');

    try {
      const result = await importStudentsFromSheets(sheetsUrl);
      if (result.success) {
        setImportStatus('success');
        Alert.alert(
          "Success!", 
          `Successfully imported ${result.count} students from Google Sheets.`
        );
        setSheetsUrl("");
        setShowImportModal(false);
      } else {
        setImportStatus('error');
        Alert.alert("Import Failed", result.error || "Failed to import students");
      }
    } catch (error) {
      setImportStatus('error');
      Alert.alert("Error", "An unexpected error occurred while importing");
      console.error("Import error:", error);
    } finally {
      setIsImporting(false);
    }
  };

  const isValidGoogleSheetsUrl = (url: string): boolean => {
    const trimmed = url.trim();
    return trimmed.includes('docs.google.com/spreadsheets') || 
           trimmed.includes('sheets.google.com') ||
           /^[a-zA-Z0-9-_]{20,}$/.test(trimmed);
  };

  const renderStudent = ({ item }: { item: Student }) => (
    <TouchableOpacity
      style={styles.studentCard}
      onPress={() => {
        if (item.hasTicket) {
          router.push(`/ticket/${item.id}`);
        }
      }}
      activeOpacity={item.hasTicket ? 0.7 : 1}
    >
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.name}</Text>
        <Text style={styles.studentEmail}>{item.email}</Text>
        <Text style={styles.studentId}>ID: {item.studentId}</Text>
        {item.ticketCount && item.ticketCount > 1 && (
          <Text style={styles.ticketCount}>Tickets: {item.ticketCount}</Text>
        )}
        {item.guestName && (
          <Text style={styles.guestInfo}>Guest: {item.guestName}</Text>
        )}
        {item.guestSchool && (
          <Text style={styles.guestSchool}>School: {item.guestSchool}</Text>
        )}
      </View>
      
      <View style={styles.actionContainer}>
        {item.hasTicket ? (
          <View style={styles.ticketStatus}>
            <CheckCircle size={20} color="#10b981" />
            <Text style={styles.ticketStatusText}>Has Ticket</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.generateButton}
            onPress={() => handleGenerateTicket(item)}
          >
            <QrCode size={18} color="#ffffff" />
            <Text style={styles.generateButtonText}>Generate</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6cace4" />
        <Text style={styles.loadingText}>Loading students...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: currentEvent?.name || "Students",
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setShowImportModal(true)}
              style={styles.headerButton}
            >
              <Upload size={20} color="#ffffff" />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Search size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, or ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
      </View>

      <FlatList
        data={filteredStudents}
        renderItem={renderStudent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No students found</Text>
          </View>
        }
      />

      <Modal
        visible={showImportModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowImportModal(false)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Import Students</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.importHeader}>
              <FileText size={48} color="#6cace4" />
              <Text style={styles.importTitle}>Import from Google Sheets</Text>
              <Text style={styles.importSubtitle}>
                Import student information directly from Google Sheets
              </Text>
            </View>

            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsTitle}>Quick Setup</Text>
              
              <View style={styles.stepContainer}>
                <View style={styles.step}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text style={styles.stepText}>Use your Google Form response sheet with First Name, Last Name, Email Address, Grade columns</Text>
                </View>
                
                <View style={styles.step}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <Text style={styles.stepText}>Make the sheet publicly accessible (Anyone with link can view)</Text>
                </View>
                
                <View style={styles.step}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <Text style={styles.stepText}>Copy and paste the sheet URL below</Text>
                </View>
              </View>
            </View>

            <View style={styles.importCard}>
              <Text style={styles.inputLabel}>Google Sheets URL</Text>
              <TextInput
                style={styles.urlInput}
                placeholder="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"
                value={sheetsUrl}
                onChangeText={setSheetsUrl}
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              
              {sheetsUrl.length > 0 && !isValidGoogleSheetsUrl(sheetsUrl) && (
                <View style={styles.warningContainer}>
                  <AlertCircle size={16} color="#f59e0b" />
                  <Text style={styles.warningText}>
                    Please enter a valid Google Sheets URL
                  </Text>
                </View>
              )}
              
              {importStatus === 'success' && (
                <View style={styles.statusContainer}>
                  <CheckCircle size={20} color="#10b981" />
                  <Text style={styles.successText}>Import completed successfully!</Text>
                </View>
              )}
              
              {importStatus === 'error' && (
                <View style={styles.statusContainer}>
                  <AlertCircle size={20} color="#ef4444" />
                  <Text style={styles.errorText}>Import failed. Please check your URL and try again.</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.importButton, isImporting && styles.importButtonDisabled]}
                onPress={handleImport}
                disabled={isImporting}
              >
                {isImporting ? (
                  <>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.importButtonText}>Importing...</Text>
                  </>
                ) : (
                  <>
                    <Download size={20} color="#ffffff" />
                    <Text style={styles.importButtonText}>Import Students</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
      </View>
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1f2937",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  studentCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 2,
  },
  studentId: {
    fontSize: 12,
    color: "#9ca3af",
  },
  ticketCount: {
    fontSize: 12,
    color: "#6cace4",
    fontWeight: "500",
    marginTop: 2,
  },
  guestInfo: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  guestSchool: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 1,
  },
  actionContainer: {
    marginLeft: 12,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6cace4",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  generateButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  ticketStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ticketStatusText: {
    color: "#10b981",
    fontSize: 14,
    fontWeight: "500",
  },
  separator: {
    height: 12,
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#9ca3af",
  },
  headerButton: {
    padding: 8,
    marginRight: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#6cace4",
    paddingTop: 50,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    color: "#ffffff",
    fontSize: 16,
  },
  placeholder: {
    width: 60,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  importHeader: {
    alignItems: "center",
    marginBottom: 24,
    paddingVertical: 20,
  },
  importTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937",
    marginTop: 12,
    marginBottom: 8,
  },
  importSubtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 22,
  },
  instructionsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 16,
  },
  stepContainer: {
    marginBottom: 16,
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#6cace4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
  },
  importCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  urlInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#1f2937",
    backgroundColor: "#ffffff",
    minHeight: 80,
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  successText: {
    color: "#10b981",
    fontSize: 14,
    fontWeight: "500",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "500",
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 6,
  },
  warningText: {
    color: "#f59e0b",
    fontSize: 13,
    flex: 1,
  },
  importButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6cace4",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  importButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  importButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});