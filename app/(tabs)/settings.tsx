import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Calendar, Clock, MapPin, Edit3, Save, X, ChevronDown, FileText, Navigation } from "lucide-react-native";
import { useEvent } from "@/hooks/useEvent";

export default function SettingsScreen() {
  const { currentEvent, updateCurrentEvent, isLoading } = useEvent();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: currentEvent?.name || "",
    date: currentEvent?.date || "",
    time: currentEvent?.time || "",
    location: currentEvent?.location || "",
    description: currentEvent?.description || "",
    instructions: currentEvent?.instructions || "",
    directions: currentEvent?.directions || "",
  });
  const [timeFormat, setTimeFormat] = useState({ hour: "", minute: "", period: "AM" });
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);

  const convertTo12Hour = (time24: string) => {
    const [hours, minutes] = time24.split(":");
    const hour24 = parseInt(hours, 10);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const period = hour24 >= 12 ? "PM" : "AM";
    return {
      hour: hour12.toString(),
      minute: minutes,
      period,
    };
  };

  const convertTo24Hour = (hour: string, minute: string, period: string) => {
    let hour24 = parseInt(hour, 10);
    if (period === "AM" && hour24 === 12) {
      hour24 = 0;
    } else if (period === "PM" && hour24 !== 12) {
      hour24 += 12;
    }
    return `${hour24.toString().padStart(2, "0")}:${minute}`;
  };

  const handleEdit = () => {
    if (currentEvent) {
      const time12 = convertTo12Hour(currentEvent.time);
      setFormData({
        name: currentEvent.name,
        date: currentEvent.date,
        time: currentEvent.time,
        location: currentEvent.location || "",
        description: currentEvent.description || "",
        instructions: currentEvent.instructions || "",
        directions: currentEvent.directions || "",
      });
      setTimeFormat(time12);
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setShowPeriodPicker(false);
    if (currentEvent) {
      const time12 = convertTo12Hour(currentEvent.time);
      setFormData({
        name: currentEvent.name,
        date: currentEvent.date,
        time: currentEvent.time,
        location: currentEvent.location || "",
        description: currentEvent.description || "",
        instructions: currentEvent.instructions || "",
        directions: currentEvent.directions || "",
      });
      setTimeFormat(time12);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Event name is required");
      return;
    }

    if (!formData.date.trim()) {
      Alert.alert("Error", "Event date is required");
      return;
    }

    if (!formData.time.trim()) {
      Alert.alert("Error", "Event time is required");
      return;
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(formData.date)) {
      Alert.alert("Error", "Please enter date in YYYY-MM-DD format");
      return;
    }

    // Validate time format
    const hourNum = parseInt(timeFormat.hour, 10);
    const minuteNum = parseInt(timeFormat.minute, 10);
    
    if (!timeFormat.hour || !timeFormat.minute) {
      Alert.alert("Error", "Please enter both hour and minute");
      return;
    }
    
    if (isNaN(hourNum) || hourNum < 1 || hourNum > 12) {
      Alert.alert("Error", "Hour must be between 1 and 12");
      return;
    }
    
    if (isNaN(minuteNum) || minuteNum < 0 || minuteNum > 59) {
      Alert.alert("Error", "Minutes must be between 00 and 59");
      return;
    }
    
    const time24 = convertTo24Hour(timeFormat.hour, timeFormat.minute.padStart(2, "0"), timeFormat.period);

    setIsSaving(true);
    try {
      await updateCurrentEvent({
        name: formData.name.trim(),
        date: formData.date.trim(),
        time: time24,
        location: formData.location.trim() || undefined,
        description: formData.description.trim() || undefined,
        instructions: formData.instructions.trim() || undefined,
        directions: formData.directions.trim() || undefined,
      });
      setIsEditing(false);
      Alert.alert("Success", "Event details updated successfully!");
    } catch (error) {
      console.error("Failed to update event:", error);
      Alert.alert("Error", "Failed to update event details. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(":");
      const date = new Date();
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return timeString;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6cace4" />
        <Text style={styles.loadingText}>Loading event settings...</Text>
      </View>
    );
  }

  if (!currentEvent) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No event found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Event Settings</Text>
        <Text style={styles.subtitle}>Configure your event details</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Current Event</Text>
          {!isEditing && (
            <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
              <Edit3 size={20} color="#6cace4" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {isEditing ? (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Event Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Enter event name"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date * (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={formData.date}
                onChangeText={(text) => setFormData({ ...formData, date: text })}
                placeholder="2024-12-31"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Time *</Text>
              <View style={styles.timeInputContainer}>
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  value={timeFormat.hour}
                  onChangeText={(text) => {
                    // Only allow numbers 1-12
                    const numericText = text.replace(/[^0-9]/g, '');
                    if (numericText === '' || (parseInt(numericText, 10) >= 1 && parseInt(numericText, 10) <= 12)) {
                      setTimeFormat({ ...timeFormat, hour: numericText });
                    }
                  }}
                  placeholder="12"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  maxLength={2}
                />
                <Text style={styles.timeSeparator}>:</Text>
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  value={timeFormat.minute}
                  onChangeText={(text) => {
                    // Only allow numbers 00-59
                    const numericText = text.replace(/[^0-9]/g, '');
                    if (numericText === '' || (parseInt(numericText, 10) >= 0 && parseInt(numericText, 10) <= 59)) {
                      setTimeFormat({ ...timeFormat, minute: numericText });
                    }
                  }}
                  placeholder="00"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  maxLength={2}
                />
                <TouchableOpacity
                  style={styles.periodSelector}
                  onPress={() => setShowPeriodPicker(!showPeriodPicker)}
                >
                  <Text style={styles.periodText}>{timeFormat.period}</Text>
                  <ChevronDown size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
              {showPeriodPicker && (
                <View style={styles.periodPicker}>
                  <TouchableOpacity
                    style={[
                      styles.periodOption,
                      timeFormat.period === "AM" && styles.periodOptionSelected,
                    ]}
                    onPress={() => {
                      setTimeFormat({ ...timeFormat, period: "AM" });
                      setShowPeriodPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.periodOptionText,
                        timeFormat.period === "AM" && styles.periodOptionTextSelected,
                      ]}
                    >
                      AM
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.periodOption,
                      timeFormat.period === "PM" && styles.periodOptionSelected,
                    ]}
                    onPress={() => {
                      setTimeFormat({ ...timeFormat, period: "PM" });
                      setShowPeriodPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.periodOptionText,
                        timeFormat.period === "PM" && styles.periodOptionTextSelected,
                      ]}
                    >
                      PM
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={formData.location}
                onChangeText={(text) => setFormData({ ...formData, location: text })}
                placeholder="Enter event location"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Enter event description"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ticket Instructions</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.instructions}
                onChangeText={(text) => setFormData({ ...formData, instructions: text })}
                placeholder="Enter ticket instructions (e.g., • Present QR code at entrance\n• Keep ticket safe)" 
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Directions to Event</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.directions}
                onChangeText={(text) => setFormData({ ...formData, directions: text })}
                placeholder="Enter directions to the event location"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                disabled={isSaving}
              >
                <X size={18} color="#6b7280" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Save size={18} color="#ffffff" />
                )}
                <Text style={styles.saveButtonText}>
                  {isSaving ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.eventDetails}>
            <View style={styles.detailRow}>
              <Calendar size={20} color="#6b7280" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Event Name</Text>
                <Text style={styles.detailValue}>{currentEvent.name}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Calendar size={20} color="#6b7280" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>{formatDate(currentEvent.date)}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Clock size={20} color="#6b7280" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>{formatTime(currentEvent.time)}</Text>
              </View>
            </View>

            {currentEvent.location && (
              <View style={styles.detailRow}>
                <MapPin size={20} color="#6b7280" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{currentEvent.location}</Text>
                </View>
              </View>
            )}

            {currentEvent.description && (
              <View style={styles.detailRow}>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>{currentEvent.description}</Text>
                </View>
              </View>
            )}

            {currentEvent.instructions && (
              <View style={styles.detailRow}>
                <FileText size={20} color="#6b7280" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Ticket Instructions</Text>
                  <Text style={styles.detailValue}>{currentEvent.instructions}</Text>
                </View>
              </View>
            )}

            {currentEvent.directions && (
              <View style={styles.detailRow}>
                <Navigation size={20} color="#6b7280" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Directions</Text>
                  <Text style={styles.detailValue}>{currentEvent.directions}</Text>
                </View>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>About Event Settings</Text>
        <Text style={styles.infoText}>
          These settings control the event information displayed on tickets and throughout the app.
          Changes will apply to all new tickets generated after saving. Use the instructions field to provide
          ticket-specific guidance, and the directions field for location information.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  contentContainer: {
    padding: 16,
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e6f3ff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  editButtonText: {
    color: "#6cace4",
    fontSize: 14,
    fontWeight: "500",
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1f2937",
    backgroundColor: "#ffffff",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  cancelButtonText: {
    color: "#6b7280",
    fontSize: 16,
    fontWeight: "500",
  },
  saveButton: {
    backgroundColor: "#6cace4",
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
  },
  eventDetails: {
    gap: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  detailContent: {
    flex: 1,
    gap: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 16,
    color: "#1f2937",
    fontWeight: "400",
  },
  infoCard: {
    backgroundColor: "#e6f3ff",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#6cace4",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6cace4",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#6cace4",
    lineHeight: 20,
  },
  timeInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeInput: {
    flex: 1,
    textAlign: "center",
    minWidth: 50,
  },
  timeSeparator: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
  },
  periodSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
    minWidth: 70,
  },
  periodText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
  },
  periodPicker: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 4,
  },
  periodOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  periodOptionSelected: {
    backgroundColor: "#6cace4",
  },
  periodOptionText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
  },
  periodOptionTextSelected: {
    color: "#ffffff",
  },
});