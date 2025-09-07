import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  Platform,
  TextInput,
} from "react-native";
import { Camera, X, CheckCircle, XCircle, Wifi, WifiOff, Users, Clock, Keyboard } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStudents } from "@/hooks/useStudents";
import { useEvent } from "@/hooks/useEvent";
import { Student } from "@/types/student";
import { syncService } from "@/utils/syncService";

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedStudent, setScannedStudent] = useState<Student | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const { students, validateTicket, validations, deviceId, syncWithOtherDevices } = useStudents();
  const { currentEvent } = useEvent();

  useEffect(() => {
    // Start auto-sync for multi-device support
    if (currentEvent?.id) {
      syncService.startAutoSync(currentEvent.id, (syncData) => {
        setLastSyncTime(new Date().toLocaleTimeString());
        // Trigger sync with other devices
        syncWithOtherDevices(currentEvent.id);
      });
    }

    return () => {
      syncService.stopAutoSync();
    };
  }, [currentEvent?.id, syncWithOtherDevices]);

  const totalValidated = validations.length;
  const totalWithTickets = students.filter(s => s.hasTicket).length;

  const handleStartScan = () => {
    // Simulate scanning - in production, this would use the camera
    setIsScanning(true);
    
    // Simulate a scan after 2 seconds
    setTimeout(() => {
      const randomStudent = students.filter(s => s.hasTicket)[Math.floor(Math.random() * students.filter(s => s.hasTicket).length)];
      if (randomStudent) {
        handleScanResult(randomStudent.id);
      } else {
        Alert.alert("No Tickets", "No tickets have been generated yet.");
        setIsScanning(false);
      }
    }, 2000);
  };

  const handleScanResult = async (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (student && student.hasTicket) {
      try {
        const result = await validateTicket(
          studentId, 
          currentEvent?.id || 'default',
          `Scanner (${deviceId.slice(-8)})`
        );
        
        if (result.success) {
          setScannedStudent({ ...student, isValidated: true });
        } else if (result.alreadyValidated) {
          setScannedStudent({ 
            ...student, 
            isValidated: false,
            validatedBy: result.validatedBy 
          });
        } else {
          setScannedStudent({ ...student, isValidated: false });
        }
        
        setShowResult(true);
      } catch (error) {
        console.error('Validation error:', error);
        Alert.alert("Validation Error", "Failed to validate ticket. Please try again.");
      }
    } else {
      Alert.alert("Invalid Ticket", "This QR code is not valid.");
    }
    setIsScanning(false);
  };

  const closeResult = () => {
    setShowResult(false);
    setScannedStudent(null);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusItem}>
          {isOnline ? (
            <Wifi size={16} color="#10b981" />
          ) : (
            <WifiOff size={16} color="#ef4444" />
          )}
          <Text style={[styles.statusText, { color: isOnline ? '#10b981' : '#ef4444' }]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
        
        <View style={styles.statusItem}>
          <Users size={16} color="#6cace4" />
          <Text style={styles.statusText}>
            {totalValidated}/{totalWithTickets} Validated
          </Text>
        </View>
        
        {lastSyncTime && (
          <View style={styles.statusItem}>
            <Clock size={16} color="#6b7280" />
            <Text style={styles.statusText}>
              Synced: {lastSyncTime}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.scannerContainer}>
        <View style={styles.scannerFrame}>
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />
          
          {isScanning && (
            <View style={styles.scanLine} />
          )}
        </View>
        
        <Text style={styles.instructionText}>
          {isScanning ? "Scanning..." : "Position QR code within frame"}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
        onPress={handleStartScan}
        disabled={isScanning}
      >
        <Camera size={24} color="#ffffff" />
        <Text style={styles.scanButtonText}>
          {isScanning ? "Scanning..." : "Start Scan"}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showResult}
        transparent
        animationType="slide"
        onRequestClose={closeResult}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={closeResult}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>

            <View style={styles.resultIcon}>
              {scannedStudent?.isValidated ? (
                <CheckCircle size={64} color="#10b981" />
              ) : (
                <XCircle size={64} color="#ef4444" />
              )}
            </View>

            <Text style={styles.resultTitle}>
              {scannedStudent?.isValidated ? "Valid Ticket" : 
               scannedStudent?.validatedBy ? `Already Scanned by ${scannedStudent.validatedBy}` : "Already Scanned"}
            </Text>

            {scannedStudent && (
              <View style={styles.studentDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Name:</Text>
                  <Text style={styles.detailValue}>{scannedStudent.name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Student ID:</Text>
                  <Text style={styles.detailValue}>{scannedStudent.studentId}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ticket #:</Text>
                  <Text style={styles.detailValue}>{scannedStudent.ticketNumber}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailValue}>{scannedStudent.email}</Text>
                </View>
                {scannedStudent.validatedBy && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Validated by:</Text>
                    <Text style={styles.detailValue}>{scannedStudent.validatedBy}</Text>
                  </View>
                )}
                {scannedStudent.validatedAt && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Validated at:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(scannedStudent.validatedAt).toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.confirmButton,
                !scannedStudent?.isValidated && styles.confirmButtonDisabled
              ]}
              onPress={closeResult}
            >
              <Text style={styles.confirmButtonText}>
                {scannedStudent?.isValidated ? "Confirm Entry" : "Close"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1f2937",
    padding: 20,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  scannerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scannerFrame: {
    width: 250,
    height: 250,
    position: "relative",
  },
  cornerTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 50,
    height: 50,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: "#6cace4",
  },
  cornerTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 50,
    height: 50,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: "#6cace4",
  },
  cornerBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 50,
    height: 50,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: "#6cace4",
  },
  cornerBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 50,
    height: 50,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: "#6cace4",
  },
  scanLine: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#6cace4",
    opacity: 0.8,
  },
  instructionText: {
    color: "#ffffff",
    fontSize: 16,
    marginTop: 32,
    textAlign: "center",
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6cace4",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 12,
  },
  scanButtonDisabled: {
    opacity: 0.5,
  },
  scanButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    width: "90%",
    maxWidth: 400,
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 1,
  },
  resultIcon: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 24,
    color: "#1f2937",
  },
  studentDetails: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  confirmButton: {
    backgroundColor: "#10b981",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    backgroundColor: "#6b7280",
  },
  confirmButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});