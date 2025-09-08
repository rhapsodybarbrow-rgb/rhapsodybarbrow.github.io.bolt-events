import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from "react-native";
import { Plus, Calendar, Clock, MapPin, ChevronRight, Upload, Trash2, X, Share2, Copy, QrCode, Camera } from "lucide-react-native";
import { router } from "expo-router";
import * as ImagePicker from 'expo-image-picker';
import { useEvent } from "@/hooks/useEvent";
import { useStudents } from "@/hooks/useStudents";
import { Event } from "@/types/event";

export default function EventsScreen() {
  const { events, currentEvent, createNewEvent, switchToEvent, deleteEvent, isLoading } = useEvent();
  const { importStudentsFromSheets, shareEvent, loadSharedEvent } = useStudents();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCode, setShareCode] = useState("");
  const [loadShareCode, setLoadShareCode] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [isLoadingShared, setIsLoadingShared] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    date: new Date().toISOString().split('T')[0],
    time: "18:00",
    location: "",
    description: "",
    imageUrl: "",
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleCreateEvent = async () => {
    if (!formData.name.trim() || !formData.location.trim()) {
      Alert.alert("Error", "Please fill in the event name and location.");
      return;
    }

    setIsCreating(true);
    try {
      await createNewEvent({
        name: formData.name.trim(),
        date: formData.date,
        time: formData.time,
        location: formData.location.trim(),
        description: formData.description.trim() || "Event description",
        imageUrl: selectedImage || formData.imageUrl.trim() || undefined,
        instructions: "• Present this QR code at the entrance\n• Keep this ticket safe - screenshots are accepted\n• Doors open 30 minutes before event time\n• This ticket is non-transferable",
        directions: "Enter through the main entrance and follow the signs to the event hall. Parking is available in the main lot.",
      });
      
      setShowCreateForm(false);
      setFormData({
        name: "",
        date: new Date().toISOString().split('T')[0],
        time: "18:00",
        location: "",
        description: "",
        imageUrl: "",
      });
      setSelectedImage(null);
      
      router.push("/(tabs)/students");
    } catch {
      Alert.alert("Error", "Failed to create event. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleImportStudents = async () => {
    if (!importUrl.trim()) {
      Alert.alert("Error", "Please enter a Google Sheets URL.");
      return;
    }

    setIsImporting(true);
    try {
      const result = await importStudentsFromSheets(importUrl.trim());
      
      if (result.success) {
        Alert.alert(
          "Import Successful", 
          `Successfully imported ${result.count} new students.`,
          [{ text: "OK", onPress: () => setShowImportForm(false) }]
        );
        setImportUrl("");
      } else {
        Alert.alert("Import Failed", result.error || "Failed to import students.");
      }
    } catch {
      Alert.alert("Import Failed", "An unexpected error occurred while importing students.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleSelectEvent = async (event: Event) => {
    try {
      await switchToEvent(event.id);
      router.push("/(tabs)/students");
    } catch {
      Alert.alert("Error", "Failed to switch to event. Please try again.");
    }
  };

  const handleShareEvent = async (event: Event) => {
    setIsSharing(true);
    try {
      const result = await shareEvent(event);
      if (result.success && result.shareCode) {
        setShareCode(result.shareCode);
        setShowShareModal(true);
      } else {
        Alert.alert("Share Failed", result.error || "Failed to create shareable event");
      }
    } catch (error) {
      Alert.alert("Share Failed", "An unexpected error occurred while sharing the event");
    } finally {
      setIsSharing(false);
    }
  };

  const handleLoadSharedEvent = async () => {
    if (!loadShareCode.trim()) {
      Alert.alert("Error", "Please enter a share code");
      return;
    }

    setIsLoadingShared(true);
    try {
      const result = await loadSharedEvent(loadShareCode.trim());
      if (result.success) {
        Alert.alert(
          "Event Loaded", 
          `Successfully loaded shared event: ${result.event?.name}`,
          [{ text: "OK", onPress: () => {
            setShowShareModal(false);
            setLoadShareCode("");
          }}]
        );
      } else {
        Alert.alert("Load Failed", result.error || "Failed to load shared event");
      }
    } catch (error) {
      Alert.alert("Load Failed", "An unexpected error occurred while loading the shared event");
    } finally {
      setIsLoadingShared(false);
    }
  };

  const copyShareCode = () => {
    // In a real app, you'd use Clipboard API
    Alert.alert("Share Code", `Share code: ${shareCode}\n\nShare this code with other devices to sync this event.`);
  };

  const pickImageFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setIsUploadingImage(true);
        const asset = result.assets[0];
        
        if (asset.base64) {
          try {
            // Validate base64 data
            const mimeType = asset.mimeType || 'image/jpeg';
            const base64Data = asset.base64;
            
            // Check if base64 is valid
            if (!base64Data || typeof base64Data !== 'string') {
              throw new Error('Invalid base64 data received');
            }
            
            // Remove any whitespace or newlines that might corrupt the base64
            const cleanBase64 = base64Data.replace(/\s/g, '');
            const base64Image = `data:${mimeType};base64,${cleanBase64}`;
            
            setSelectedImage(base64Image);
            setFormData({ ...formData, imageUrl: "" }); // Clear URL input when image is selected
          } catch (error) {
            console.error('Error processing image:', error);
            Alert.alert('Error', 'Failed to process the selected image. Please try again.');
          }
        }
        setIsUploadingImage(false);
      }
    } catch (error) {
      setIsUploadingImage(false);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera permissions to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setIsUploadingImage(true);
        const asset = result.assets[0];
        
        if (asset.base64) {
          try {
            // Validate base64 data
            const mimeType = asset.mimeType || 'image/jpeg';
            const base64Data = asset.base64;
            
            // Check if base64 is valid
            if (!base64Data || typeof base64Data !== 'string') {
              throw new Error('Invalid base64 data received');
            }
            
            // Remove any whitespace or newlines that might corrupt the base64
            const cleanBase64 = base64Data.replace(/\s/g, '');
            const base64Image = `data:${mimeType};base64,${cleanBase64}`;
            
            setSelectedImage(base64Image);
            setFormData({ ...formData, imageUrl: "" }); // Clear URL input when image is selected
          } catch (error) {
            console.error('Error processing image:', error);
            Alert.alert('Error', 'Failed to process the selected image. Please try again.');
          }
        }
        setIsUploadingImage(false);
      }
    } catch (error) {
      setIsUploadingImage(false);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Select Image',
      'Choose how you want to add an image for your event',
      [
        {
          text: 'Camera',
          onPress: takePhoto,
        },
        {
          text: 'Photo Library',
          onPress: pickImageFromLibrary,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
  };

  const handleDeleteEvent = async (eventId: string, eventName: string) => {
    Alert.alert(
      "Delete Event",
      `Are you sure you want to delete "${eventName}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {}
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteEvent(eventId);

              Alert.alert("Success", "Event deleted successfully.");
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : "Failed to delete event. Please try again.";
              Alert.alert("Error", errorMessage);
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6cace4" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (showCreateForm) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Create New Event</Text>
            <Text style={styles.subtitle}>Set up your event details</Text>
          </View>

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
              <Text style={styles.label}>Date</Text>
              <TextInput
                style={styles.input}
                value={formData.date}
                onChangeText={(text) => setFormData({ ...formData, date: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Time</Text>
              <TextInput
                style={styles.input}
                value={formData.time}
                onChangeText={(text) => setFormData({ ...formData, time: text })}
                placeholder="HH:MM (24-hour format)"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location *</Text>
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
                placeholder="Enter event description (optional)"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ticket Image</Text>
              <Text style={styles.inputDescription}>
                Add an image that will be displayed on the ticket
              </Text>
              
              {/* Image Upload Buttons */}
              <View style={styles.imageUploadContainer}>
                <TouchableOpacity
                  style={[styles.imageUploadButton, isUploadingImage && styles.disabledButton]}
                  onPress={showImagePickerOptions}
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? (
                    <ActivityIndicator size="small" color="#6cace4" />
                  ) : (
                    <Camera size={20} color="#6cace4" />
                  )}
                  <Text style={styles.imageUploadButtonText}>
                    {isUploadingImage ? 'Uploading...' : 'Upload Image'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {/* Selected Image Preview */}
              {selectedImage && (
                <View style={styles.imagePreviewContainer}>
                  <View style={styles.previewHeader}>
                    <Text style={styles.previewLabel}>Selected Image:</Text>
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={removeSelectedImage}
                    >
                      <X size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                  <Image
                    source={{ uri: selectedImage }}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                </View>
              )}
              
              {/* URL Input (only show if no image selected) */}
              {!selectedImage && (
                <>
                  <Text style={styles.orText}>Or enter image URL:</Text>
                  <View style={styles.imageInputContainer}>
                    <TextInput
                      style={styles.input}
                      value={formData.imageUrl}
                      onChangeText={(text) => setFormData({ ...formData, imageUrl: text })}
                      placeholder="Enter image URL (optional)"
                      placeholderTextColor="#9ca3af"
                    />
                    {formData.imageUrl.trim() && (
                      <TouchableOpacity
                        style={styles.clearImageButton}
                        onPress={() => setFormData({ ...formData, imageUrl: "" })}
                      >
                        <X size={16} color="#6b7280" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {formData.imageUrl.trim() && (
                    <View style={styles.imagePreviewContainer}>
                      <Text style={styles.previewLabel}>Preview:</Text>
                      <Image
                        source={{ uri: formData.imageUrl.trim() }}
                        style={styles.imagePreview}
                        resizeMode="cover"
                        onError={() => {
                          Alert.alert("Invalid Image", "The image URL provided is not valid or accessible.");
                        }}
                      />
                    </View>
                  )}
                </>
              )}
            </View>

            <View style={styles.importSection}>
              <Text style={styles.sectionLabel}>Import Student List</Text>
              <Text style={styles.sectionDescription}>
                Import students from a Google Sheets document
              </Text>
              
              {!showImportForm ? (
                <TouchableOpacity
                  style={styles.importButton}
                  onPress={() => setShowImportForm(true)}
                >
                  <Upload size={20} color="#6cace4" />
                  <Text style={styles.importButtonText}>Import from Google Sheets</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.importForm}>
                  <TextInput
                    style={styles.input}
                    value={importUrl}
                    onChangeText={setImportUrl}
                    placeholder="Paste Google Sheets URL here"
                    placeholderTextColor="#9ca3af"
                    multiline
                  />
                  <View style={styles.importButtonContainer}>
                    <TouchableOpacity
                      style={styles.cancelImportButton}
                      onPress={() => {
                        setShowImportForm(false);
                        setImportUrl("");
                      }}
                      disabled={isImporting}
                    >
                      <Text style={styles.cancelImportButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.confirmImportButton, isImporting && styles.disabledButton]}
                      onPress={handleImportStudents}
                      disabled={isImporting}
                    >
                      {isImporting ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.confirmImportButtonText}>Import</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowCreateForm(false)}
              disabled={isCreating}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.createButton, isCreating && styles.disabledButton]}
              onPress={handleCreateEvent}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.createButtonText}>Create Event</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Image 
              source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/1u3dh0aeownsqci0xxagd' }} 
              style={styles.boltEventsLogo} 
              resizeMode="contain"
            />
          </View>
          <Text style={styles.subtitle}>Create a new event or manage existing ones</Text>
        </View>

        <TouchableOpacity
          style={styles.createEventCard}
          onPress={() => setShowCreateForm(true)}
          activeOpacity={0.7}
        >
          <View style={styles.createEventIcon}>
            <Plus size={32} color="#ffffff" />
          </View>
          <View style={styles.createEventContent}>
            <Text style={styles.createEventTitle}>Create New Event</Text>
            <Text style={styles.createEventSubtitle}>Set up a new event with tickets</Text>
          </View>
          <ChevronRight size={24} color="#6cace4" />
        </TouchableOpacity>

        {events.length > 0 && (
          <View style={styles.eventsSection}>
            <Text style={styles.sectionTitle}>Your Events</Text>
            
            {events.map((event) => (
              <View key={event.id} style={styles.eventCardContainer}>
                <TouchableOpacity
                  style={[
                    styles.eventCard,
                    currentEvent?.id === event.id && styles.currentEventCard
                  ]}
                  onPress={() => handleSelectEvent(event)}
                  activeOpacity={0.7}
                >
                  <View style={styles.eventContent}>
                    <View style={styles.eventHeader}>
                      <Text style={styles.eventName}>{event.name}</Text>
                      {currentEvent?.id === event.id && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>Current</Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.eventDetails}>
                      <View style={styles.eventDetail}>
                        <Calendar size={16} color="#6b7280" />
                        <Text style={styles.eventDetailText}>{formatDate(event.date)}</Text>
                      </View>
                      
                      <View style={styles.eventDetail}>
                        <Clock size={16} color="#6b7280" />
                        <Text style={styles.eventDetailText}>{formatTime(event.time)}</Text>
                      </View>
                      
                      <View style={styles.eventDetail}>
                        <MapPin size={16} color="#6b7280" />
                        <Text style={styles.eventDetailText}>{event.location}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <ChevronRight size={20} color="#9ca3af" />
                </TouchableOpacity>
                
                <View style={styles.eventActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleShareEvent(event)}
                    activeOpacity={0.7}
                    disabled={isSharing}
                  >
                    <Share2 size={16} color="#6cace4" />
                  </TouchableOpacity>
                  
                  {events.length > 1 && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDeleteEvent(event.id, event.name)}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
        
        {/* Share/Load Event Button */}
        <View style={styles.shareSection}>
          <TouchableOpacity
            style={styles.shareLoadButton}
            onPress={() => setShowShareModal(true)}
            activeOpacity={0.7}
          >
            <QrCode size={20} color="#ffffff" />
            <Text style={styles.shareLoadButtonText}>Share or Load Event</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Share Modal */}
      <Modal
        visible={showShareModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share or Load Event</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowShareModal(false);
                  setShareCode("");
                  setLoadShareCode("");
                }}
              >
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            {shareCode ? (
              <View style={styles.shareCodeSection}>
                <Text style={styles.shareCodeTitle}>Event Shared Successfully!</Text>
                <Text style={styles.shareCodeDescription}>
                  Share this code with other devices to sync this event:
                </Text>
                <View style={styles.shareCodeContainer}>
                  <Text style={styles.shareCodeText}>{shareCode}</Text>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={copyShareCode}
                  >
                    <Copy size={16} color="#6cace4" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.loadEventSection}>
                <Text style={styles.loadEventTitle}>Load Shared Event</Text>
                <Text style={styles.loadEventDescription}>
                  Enter a share code to load an event from another device:
                </Text>
                <TextInput
                  style={styles.shareCodeInput}
                  value={loadShareCode}
                  onChangeText={setLoadShareCode}
                  placeholder="Enter share code (e.g., EVT123ABC)"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={[styles.loadButton, isLoadingShared && styles.disabledButton]}
                  onPress={handleLoadSharedEvent}
                  disabled={isLoadingShared}
                >
                  {isLoadingShared ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.loadButtonText}>Load Event</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#6cace4",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#6cace4",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#ffffff",
  },
  content: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
    backgroundColor: "#f9fafb",
    marginTop: 60,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },
  titleContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  boltEventsLogo: {
    width: 280,
    height: 120,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 16,
    color: "#e0f2fe",
    opacity: 0.9,
  },
  createEventCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    marginHorizontal: 24,
    marginBottom: 32,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  createEventIcon: {
    width: 56,
    height: 56,
    backgroundColor: "#6cace4",
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  createEventContent: {
    flex: 1,
  },
  createEventTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  createEventSubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  eventsSection: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 16,
  },
  eventCardContainer: {
    marginBottom: 12,
  },
  eventCard: {
    flexDirection: "row",
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
  currentEventCard: {
    borderWidth: 2,
    borderColor: "#10b981",
  },
  eventContent: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  eventName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
  },
  currentBadge: {
    backgroundColor: "#10b981",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#ffffff",
  },
  eventDetails: {
    gap: 4,
  },
  eventDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eventDetailText: {
    fontSize: 14,
    color: "#6b7280",
  },
  form: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1f2937",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1f2937",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  inputDescription: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
  },
  imageInputContainer: {
    position: "relative",
  },
  clearImageButton: {
    position: "absolute",
    right: 12,
    top: 12,
    padding: 4,
  },
  imagePreviewContainer: {
    marginTop: 12,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
    marginBottom: 8,
  },
  imagePreview: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  imageUploadContainer: {
    marginBottom: 16,
  },
  imageUploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#6cace4",
    borderStyle: "dashed",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  imageUploadButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6cace4",
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  removeImageButton: {
    padding: 4,
    backgroundColor: "#fee2e2",
    borderRadius: 12,
  },
  orText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginVertical: 12,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
  },
  createButton: {
    flex: 1,
    backgroundColor: "#6cace4",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  disabledButton: {
    opacity: 0.6,
  },
  importSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },
  importButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#6cace4",
    borderStyle: "dashed",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6cace4",
  },
  importForm: {
    gap: 12,
  },
  importButtonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  cancelImportButton: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelImportButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  confirmImportButton: {
    flex: 1,
    backgroundColor: "#6cace4",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmImportButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  eventActions: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 1,
    flexDirection: "row",
  },
  actionButton: {
    backgroundColor: "#ffffff",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shareSection: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  shareLoadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  shareLoadButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
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
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
  },
  modalCloseButton: {
    padding: 4,
  },
  shareCodeSection: {
    alignItems: "center",
  },
  shareCodeTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#10b981",
    marginBottom: 8,
  },
  shareCodeDescription: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 20,
  },
  shareCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 12,
  },
  shareCodeText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    letterSpacing: 2,
  },
  copyButton: {
    padding: 4,
  },
  loadEventSection: {},
  loadEventTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  loadEventDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },
  shareCodeInput: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1f2937",
    marginBottom: 16,
  },
  loadButton: {
    backgroundColor: "#6cace4",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  loadButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
});