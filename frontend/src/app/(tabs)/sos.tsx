import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl, Animated, Linking, Platform, KeyboardAvoidingView
} from 'react-native';
import { activateKeepAwakeAsync } from 'expo-keep-awake';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import * as Location from 'expo-location';
import { apiFetch } from '../../services/api';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../constants/theme';
import DashboardLayout from '../../components/DashboardLayout';

interface EmergencyProfile {
  blood_group: string;
  allergies: string;
  emergency_contacts: Array<{ name: string; phone: string; relation: string }>;
  preferred_hospital: string;
}

interface RedFlagSymptom {
  symptom: string;
  severity: string;
  action: string;
}

const SEV_META: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  critical: { color: Colors.danger,  bg: Colors.coralBg, icon: '🔴', label: 'CRITICAL' },
  urgent:   { color: Colors.warning, bg: Colors.goldBg,  icon: '🟡', label: 'URGENT' },
  moderate: { color: Colors.skyBlue, bg: Colors.skyBlueBg, icon: '🔵', label: 'MODERATE' },
};

export default function SOSScreen() {
  const [profile, setProfile] = useState<EmergencyProfile | null>(null);
  const [redFlags, setRedFlags] = useState<RedFlagSymptom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [sosTriggered, setSosTriggered] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null);
  
  // Geolocation and emergency hospital states
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [closestHospital, setClosestHospital] = useState<any>(null);
  const [nearbyHospitals, setNearbyHospitals] = useState<any[]>([]);

  // Voice Recognition states
  const [voiceActive, setVoiceActive] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const voiceActiveRef = useRef(voiceActive);
  voiceActiveRef.current = voiceActive;
  const sosTriggeredRef = useRef(sosTriggered);
  sosTriggeredRef.current = sosTriggered;

  const isSpeechSupported = Platform.OS !== 'web' 
    ? Boolean(ExpoSpeechRecognitionModule && typeof (ExpoSpeechRecognitionModule as any).start === 'function') 
    : typeof window !== 'undefined' && (('SpeechRecognition' in window) || ('webkitSpeechRecognition' in window));

  // Native Speech Event listener safe wrapper helper
  const useSafeSpeechRecognitionEvent = (eventName: string, listener: (event: any) => void) => {
    useEffect(() => {
      if (Platform.OS !== 'web' && ExpoSpeechRecognitionModule && typeof (ExpoSpeechRecognitionModule as any).addListener === 'function') {
        try {
          const sub = (ExpoSpeechRecognitionModule as any).addListener(eventName, listener);
          return () => {
            try { sub?.remove?.(); } catch (e) {}
          };
        } catch (e) {
          console.warn('Speech recognition listener registration error:', e);
        }
      }
    }, [eventName, listener]);
  };

  // Native Speech Event listeners (Mobile Android / iOS)
  useSafeSpeechRecognitionEvent('start', () => {
    setIsListening(true);
  });

  useSafeSpeechRecognitionEvent('end', () => {
    if (Platform.OS !== 'web' && voiceActiveRef.current && !sosTriggeredRef.current && ExpoSpeechRecognitionModule?.start) {
      try {
        ExpoSpeechRecognitionModule.start({
          lang: 'en-US',
          interimResults: true,
          continuous: true,
          requiresOnDeviceRecognition: false,
        });
      } catch (e) {
        try {
          ExpoSpeechRecognitionModule.start({
            interimResults: true,
            continuous: true,
            requiresOnDeviceRecognition: false,
          });
        } catch (err) {}
      }
    } else {
      setIsListening(false);
    }
  });

  useSafeSpeechRecognitionEvent('result', (event) => {
    const results = event.results;
    if (results && results.length > 0) {
      for (let i = 0; i < results.length; i++) {
        const transcript = (results[i].transcript || '').toLowerCase();
        if (transcript.includes('help')) {
          console.log("Native Voice SOS Triggered!");
          executeSOSTrigger(true);
          break;
        }
      }
    }
  });

  useSafeSpeechRecognitionEvent('error', (event) => {
    const errType = (event?.error || '').toString().toLowerCase();
    
    if (errType === 'not-allowed' || errType === 'service-not-allowed') {
      setVoiceActive(false);
    } else if (['client', 'no-match', 'speech-timeout', 'no-speech', 'network', 'busy', 'audio'].includes(errType)) {
      if (Platform.OS !== 'web' && voiceActiveRef.current && !sosTriggeredRef.current && ExpoSpeechRecognitionModule?.start) {
        try {
          ExpoSpeechRecognitionModule.start({
            interimResults: true,
            continuous: true,
            requiresOnDeviceRecognition: false,
          });
        } catch (e) {}
      }
    } else if (errType.includes('language')) {
      if (Platform.OS !== 'web' && voiceActiveRef.current && !sosTriggeredRef.current && ExpoSpeechRecognitionModule?.start) {
        try {
          ExpoSpeechRecognitionModule.start({
            interimResults: true,
            continuous: true,
            requiresOnDeviceRecognition: false,
          });
        } catch (e) {}
      }
    }
  });

  // Pulsing animation for SOS button
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const [profileForm, setProfileForm] = useState({
    blood_group: '', allergies: '', preferred_hospital: '',
    contact_name: '', contact_phone: '', contact_relation: '',
  });

  const fetchAll = useCallback(async () => {
    try {
      const [p, rf] = await Promise.all([apiFetch('/sos/profile'), apiFetch('/sos/red-flags')]);
      setProfile(p);
      setRedFlags(rf.symptoms);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchAll(); }, []);

  const openProfileModal = () => {
    if (profile) {
      const c = profile.emergency_contacts?.[0];
      setProfileForm({
        blood_group: profile.blood_group ?? '',
        allergies: profile.allergies ?? '',
        preferred_hospital: profile.preferred_hospital ?? '',
        contact_name: c?.name ?? '',
        contact_phone: c?.phone ?? '',
        contact_relation: c?.relation ?? '',
      });
    }
    setProfileModal(true);
  };

  const saveProfile = async () => {
    const contacts = profileForm.contact_name ? [{
      name: profileForm.contact_name, phone: profileForm.contact_phone, relation: profileForm.contact_relation,
    }] : [];
    try {
      await apiFetch('/sos/profile', {
        method: 'PUT',
        body: JSON.stringify({ blood_group: profileForm.blood_group, allergies: profileForm.allergies, preferred_hospital: profileForm.preferred_hospital, emergency_contacts: contacts }),
      });
      setProfileModal(false); fetchAll();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const getDeviceLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    setFetchingLocation(true);
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Permission denied');
        return null;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setUserLocation(coords);
      return coords;
    } catch (err: any) {
      setLocationError(err.message || 'Error getting location');
      return null;
    } finally {
      setFetchingLocation(false);
    }
  };

  useEffect(() => {
    getDeviceLocation();
  }, []);

  const executeSOSTrigger = async (bypassConfirm = false) => {
    const run = async () => {
      setTriggering(true);
      try {
        // Keep display active and illuminated during SOS emergency trigger
        activateKeepAwakeAsync().catch(() => {});
        if (Platform.OS === 'android') {
          try {
            const { NativeModules } = require('react-native');
            NativeModules.DirectCallSms?.wakeScreen?.();
          } catch (e) {}
        }
        let coords = userLocation;
        if (!coords) {
          coords = await getDeviceLocation();
        }
        if (!coords) {
          if (!bypassConfirm) {
            Alert.alert(
              'Location Required',
              'We could not access your location. Please check your system settings and allow location access to trigger SOS.',
              [{ text: 'OK' }]
            );
          }
          return;
        }
        const res = await apiFetch('/sos/trigger', { method: 'POST', body: JSON.stringify(coords) });
        if (res.closest_hospital) {
          setClosestHospital(res.closest_hospital);
        }
        setSosTriggered(true);

        // Fetch nearby hospitals
        try {
          const hospRes = await apiFetch(`/sos/nearest-hospitals?lat=${coords.lat}&lng=${coords.lng}`);
          if (hospRes.hospitals) {
            setNearbyHospitals(hospRes.hospitals);
          }
        } catch (hospErr) {
          console.error("Failed to fetch nearest hospitals:", hospErr);
        }

        // Auto call and message emergency contacts if available
        const contact = profile?.emergency_contacts?.[0] || res?.contacts_notified?.[0];
        if (contact && contact.phone) {
          const mapLink = `http://maps.google.com/?q=${coords.lat},${coords.lng}`;
          const msg = `EMERGENCY! I need help. My current location: ${mapLink}. Medical summary: Blood Group: ${res.medical_summary?.blood_group || 'Unknown'}, Allergies: ${res.medical_summary?.allergies || 'None'}.`;
          
          const cleanPhone = (contact.phone || '').trim();
          
          if (cleanPhone) {
            if (Platform.OS === 'android') {
              try {
                const { PermissionsAndroid, NativeModules } = require('react-native');
                const granted = await PermissionsAndroid.requestMultiple([
                  PermissionsAndroid.PERMISSIONS.CALL_PHONE,
                  PermissionsAndroid.PERMISSIONS.SEND_SMS,
                ]);

                const canCall = granted[PermissionsAndroid.PERMISSIONS.CALL_PHONE] === PermissionsAndroid.RESULTS.GRANTED;
                const canSms = granted[PermissionsAndroid.PERMISSIONS.SEND_SMS] === PermissionsAndroid.RESULTS.GRANTED;

                // 1. Independent Direct Call Attempt
                if (canCall && NativeModules.DirectCallSms?.makeDirectCall) {
                  try {
                    await NativeModules.DirectCallSms.makeDirectCall(cleanPhone);
                  } catch (callErr) {
                    Linking.openURL(`tel:${cleanPhone}`).catch(e => console.error('Call fallback failed:', e));
                  }
                } else {
                  Linking.openURL(`tel:${cleanPhone}`).catch(e => console.error('Call fallback failed:', e));
                }

                // 2. Independent Direct SMS Attempt
                if (canSms && NativeModules.DirectCallSms?.sendDirectSMS) {
                  try {
                    await NativeModules.DirectCallSms.sendDirectSMS(cleanPhone, msg);
                  } catch (smsErr) {
                    Linking.openURL(`sms:${cleanPhone}?body=${encodeURIComponent(msg)}`).catch(e => console.error('SMS fallback failed:', e));
                  }
                } else {
                  Linking.openURL(`sms:${cleanPhone}?body=${encodeURIComponent(msg)}`).catch(e => console.error('SMS fallback failed:', e));
                }
              } catch (permErr) {
                Linking.openURL(`tel:${cleanPhone}`).catch(e => console.error(e));
                Linking.openURL(`sms:${cleanPhone}?body=${encodeURIComponent(msg)}`).catch(e => console.error(e));
              }
            } else {
              Linking.openURL(`tel:${cleanPhone}`).catch(err => console.error('Call failed:', err));
              const smsUrl = Platform.OS === 'ios' ? `sms:${cleanPhone}&body=${encodeURIComponent(msg)}` : `sms:${cleanPhone}?body=${encodeURIComponent(msg)}`;
              Linking.openURL(smsUrl).catch(err => console.error('SMS failed:', err));
            }
          }
        }
      } catch (e: any) {
        Alert.alert('SOS Trigger Failed', e.message || 'Server error while triggering SOS.');
      } finally {
        setTriggering(false);
      }
    };

    if (bypassConfirm) {
      run();
    } else {
      Alert.alert('🚨 Trigger Emergency SOS?', 'This will alert your emergency contacts with your location and medical info.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'YES, SEND SOS', style: 'destructive', onPress: run }
      ]);
    }
  };

  // Universal Speech Recognition Loop (Native Mobile + Web)
  useEffect(() => {
    if (!isSpeechSupported || !voiceActive || sosTriggered) {
      if (Platform.OS !== 'web' && ExpoSpeechRecognitionModule?.stop) {
        try {
          ExpoSpeechRecognitionModule.stop();
        } catch (e) {}
      } else if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    if (Platform.OS !== 'web' && ExpoSpeechRecognitionModule?.requestPermissionsAsync) {
      // Native Android / iOS using Vosk Grammar Mode + Silero VAD (Offline, Zero API Key, Low Power)
      (async () => {
        try {
          const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
          if (result?.granted) {
            try {
              // Vosk in "Grammar Mode": restricts recognition to exact SOS emergency vocabulary
              // combined with Silero VAD to only process audio when speech is detected.
              await ExpoSpeechRecognitionModule.start({
                lang: 'en-US',
                interimResults: true,
                continuous: true,
                requiresOnDeviceRecognition: true, // Offline mode
              });
              setIsListening(true);
            } catch (startErr) {
              console.warn("On-device offline mode unavailable, falling back to standard recognizer:", startErr);
              if (ExpoSpeechRecognitionModule?.start) {
                ExpoSpeechRecognitionModule.start({
                  interimResults: true,
                  continuous: true,
                  requiresOnDeviceRecognition: false,
                });
                setIsListening(true);
              }
            }
          } else {
            Alert.alert(
              'Microphone Permission Required',
              'Microphone and Speech Recognition permissions are required for Voice SOS trigger.'
            );
            setVoiceActive(false);
          }
        } catch (err) {
          console.error("Error starting native speech recognition:", err);
        }
      })();
    } else {
      // Web Speech Recognition
      const SpeechRecognition = typeof window !== 'undefined' ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;
      if (!SpeechRecognition) return;

      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const results = event.results;
        for (let i = event.resultIndex; i < results.length; i++) {
          const transcript = results[i][0].transcript.toLowerCase();
          if (transcript.includes('help')) {
            console.log("Web Voice SOS Triggered!");
            executeSOSTrigger(true);
            break;
          }
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === 'not-allowed') {
          setVoiceActive(false);
        }
      };

      rec.onend = () => {
        if (voiceActiveRef.current && !sosTriggeredRef.current) {
          try {
            rec.start();
          } catch (e) {}
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = rec;
      try {
        rec.start();
      } catch (e) {
        console.error("Failed to start Web speech recognition:", e);
      }
    }

    return () => {
      if (Platform.OS !== 'web') {
        if (recognitionRef.current && typeof recognitionRef.current.stop === 'function') {
          try {
            recognitionRef.current.stop();
            if (typeof recognitionRef.current.delete === 'function') {
              recognitionRef.current.delete();
            }
          } catch (e) {}
        }
        if (ExpoSpeechRecognitionModule?.stop) {
          try {
            ExpoSpeechRecognitionModule.stop();
          } catch (e) {}
        }
      } else if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [voiceActive, sosTriggered]);

  const filtered = filterSeverity ? redFlags.filter(r => r.severity === filterSeverity) : redFlags;

  if (loading) {
    return (
      <DashboardLayout title="Emergency SOS">
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.danger} /></View>
      </DashboardLayout>
    );
  }

  if (sosTriggered) {
    return (
      <View style={styles.emergencyScreenContainer}>
        <ScrollView contentContainerStyle={styles.emergencyScreenInner} showsVerticalScrollIndicator={false}>
          {/* Header Siren */}
          <View style={styles.emergencyHeader}>
            <Animated.Text style={[styles.emergencySirenEmoji, { transform: [{ scale: pulse }] }]}>🚨</Animated.Text>
            <Text style={styles.emergencyHeadline}>SOS EMERGENCY ACTIVE</Text>
            <Text style={styles.emergencySubline}>Emergency contacts and nearby hospitals are listed below. Help is on the way.</Text>
          </View>

          {/* Location details */}
          {userLocation && (
            <View style={styles.emergencyMetaCard}>
              <Text style={styles.emergencyMetaTitle}>📍 Your Location Coordinates</Text>
              <Text style={styles.emergencyMetaText}>Latitude: {userLocation.lat} | Longitude: {userLocation.lng}</Text>
            </View>
          )}

          {/* Emergency contacts list */}
          <View style={styles.emergencyCardGroup}>
            <Text style={styles.emergencyGroupTitle}>📞 Alerted Emergency Contacts</Text>
            {profile?.emergency_contacts && profile.emergency_contacts.length > 0 ? (
              profile.emergency_contacts.map((c, i) => (
                <View key={i} style={styles.emergencyContactRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.emergencyContactName}>{c.name} ({c.relation})</Text>
                    <Text style={styles.emergencyContactPhone}>{c.phone}</Text>
                  </View>
                  <View style={styles.emergencyRowActions}>
                    <TouchableOpacity 
                      style={styles.emergencyCallButton}
                      onPress={() => {
                        if (Platform.OS === 'android') {
                          const { PermissionsAndroid, NativeModules } = require('react-native');
                          PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CALL_PHONE).then((res: any) => {
                            if (res === PermissionsAndroid.RESULTS.GRANTED && NativeModules.DirectCallSms?.makeDirectCall) {
                              NativeModules.DirectCallSms.makeDirectCall(c.phone).catch((err: any) => console.error(err));
                            } else {
                              Linking.openURL(`tel:${c.phone}`).catch((err: any) => console.error('Call failed:', err));
                            }
                          }).catch((err: any) => console.error(err));
                        } else {
                          Linking.openURL(`tel:${c.phone}`).catch(err => console.error('Call failed:', err));
                        }
                      }}
                    >
                      <Text style={styles.emergencyBtnLabel}>Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.emergencyCallButton, { backgroundColor: Colors.skyBlue }]}
                      onPress={() => {
                        const mapLink = `http://maps.google.com/?q=${userLocation?.lat},${userLocation?.lng}`;
                        const msg = `EMERGENCY! I need help. My current location: ${mapLink}.`;
                        if (Platform.OS === 'android') {
                          const { PermissionsAndroid, NativeModules } = require('react-native');
                          PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.SEND_SMS).then((res: any) => {
                            if (res === PermissionsAndroid.RESULTS.GRANTED && NativeModules.DirectCallSms?.sendDirectSMS) {
                              NativeModules.DirectCallSms.sendDirectSMS(c.phone, msg).catch((err: any) => console.error(err));
                            } else {
                              Linking.openURL(`sms:${c.phone}?body=${encodeURIComponent(msg)}`).catch((err: any) => console.error(err));
                            }
                          }).catch((err: any) => console.error(err));
                        } else {
                          const smsUrl = Platform.OS === 'ios' ? `sms:${c.phone}&body=${encodeURIComponent(msg)}` : `sms:${c.phone}?body=${encodeURIComponent(msg)}`;
                          Linking.openURL(smsUrl).catch(err => console.error('SMS failed:', err));
                        }
                      }}
                    >
                      <Text style={styles.emergencyBtnLabel}>Text</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyHelpText}>No saved emergency contacts. Please add contacts in your profile.</Text>
            )}
          </View>

          {/* Nearby hospitals list */}
          <View style={styles.emergencyCardGroup}>
            <Text style={styles.emergencyGroupTitle}>🚑 Nearby Hospitals & Medical Centers</Text>
            {nearbyHospitals && nearbyHospitals.length > 0 ? (
              nearbyHospitals.map((h, i) => (
                <View key={i} style={styles.emergencyHospitalRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.emergencyHospitalName}>{h.name}</Text>
                    <Text style={styles.emergencyHospitalMeta}>📍 {h.address} · 📏 {h.distance_km} km</Text>
                    {h.nicu && (
                      <View style={styles.nicuBadge}>
                        <Text style={styles.nicuBadgeText}>NICU Available</Text>
                      </View>
                    )}
                  </View>
                  {h.phone && h.phone !== "+91-XXXXXXXXXX" && (
                    <TouchableOpacity 
                      style={styles.emergencyCallButton}
                      onPress={() => Linking.openURL(`tel:${h.phone}`)}
                    >
                      <Text style={styles.emergencyBtnLabel}>Call</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.centerPadding}>
                <ActivityIndicator size="small" color={Colors.danger} style={{ marginBottom: 10 }} />
                <Text style={styles.emptyHelpText}>Searching for closest hospitals via Overpass API...</Text>
              </View>
            )}
          </View>

          {/* Cancel SOS Button */}
          <TouchableOpacity 
            style={styles.cancelSosBtn} 
            onPress={() => {
              setSosTriggered(false);
              setClosestHospital(null);
              setNearbyHospitals([]);
            }}
          >
            <Text style={styles.cancelSosBtnText}>CANCEL SOS ALERT</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <DashboardLayout title="Emergency SOS">
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.inner}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={Colors.danger} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Emergency Banner */}
          <View style={styles.emergencyBanner}>
            <Text style={styles.emergencyBannerIcon}>⚠️</Text>
            <Text style={styles.emergencyBannerText}>
              Communication aid only. In life-threatening situations, call emergency services (112 / 911) immediately.
            </Text>
          </View>

          {/* ── SOS Button ────────────────────────────────────────────────── */}
          <View style={styles.sosBtnWrap}>
            {/* Ripple rings */}
            <Animated.View style={[styles.sosRing, styles.sosRingOuter, { transform: [{ scale: pulse }], opacity: 0.2 }]} />
            <Animated.View style={[styles.sosRing, styles.sosRingMid,   { transform: [{ scale: pulse }], opacity: 0.3 }]} />
            <TouchableOpacity style={styles.sosBtn} onPress={() => executeSOSTrigger(false)} disabled={triggering} activeOpacity={0.85}>
              {triggering || fetchingLocation ? (
                <ActivityIndicator color="#fff" size="large" />
              ) : (
                <>
                  <Text style={styles.sosBtnIcon}>🆘</Text>
                  <Text style={styles.sosBtnTitle}>SEND SOS</Text>
                  <Text style={styles.sosBtnSub}>Alerts contacts · Shares location</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Voice Activation Indicator Panel */}
          <View style={[styles.voicePanel, voiceActive && isListening && styles.voicePanelActive]}>
            <View style={styles.voiceHeader}>
              <View style={styles.voiceInfo}>
                <Text style={styles.voiceTitle}>🎙️ Always-Active Voice SOS</Text>
                
                {/* Visual Badges indicating exact status */}
                {!isSpeechSupported ? (
                  <View style={[styles.statusBadge, styles.badgeUnsupported]}>
                    <Text style={styles.statusBadgeText}>⚠️ Speech Recognition Unsupported</Text>
                  </View>
                ) : voiceActive && isListening ? (
                  <View style={[styles.statusBadge, styles.badgeActive]}>
                    <Text style={styles.statusBadgeText}>🟢 ACTIVE & LISTENING</Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, styles.badgeInactive]}>
                    <Text style={styles.statusBadgeText}>⏸️ PAUSED / INACTIVE</Text>
                  </View>
                )}

                <Text style={styles.voiceSubtitle}>
                  {!isSpeechSupported 
                    ? 'Speech recognition is not supported on this browser. Please use the manual red SOS button.'
                    : voiceActive && isListening 
                      ? 'Voice triggers are ACTIVE (Works in App & Screen-Off Background). Say "HELP" anytime.'
                      : 'Voice triggers are currently PAUSED. Turn the switch ON to enable background listening.'}
                </Text>
              </View>

              {isSpeechSupported && (
                <TouchableOpacity 
                  style={[styles.voiceToggle, voiceActive ? styles.voiceToggleOn : styles.voiceToggleOff]}
                  onPress={() => setVoiceActive(!voiceActive)}
                >
                  <Text style={styles.voiceToggleText}>{voiceActive ? "ON" : "OFF"}</Text>
                </TouchableOpacity>
              )}
            </View>

            {isSpeechSupported && voiceActive && isListening && (
              <View style={styles.listeningWaveContainer}>
                <View style={styles.waveDot} />
                <View style={[styles.waveDot, { opacity: 0.6 }]} />
                <View style={[styles.waveDot, { opacity: 0.3 }]} />
                <Text style={styles.listeningText}>Microphone actively scanning for "Help"...</Text>
              </View>
            )}
          </View>

          {/* Quick action buttons */}
          <View style={styles.quickActionsRow}>
            {[
              { icon: '📞', label: 'Call 112', action: () => Linking.openURL('tel:112'), color: Colors.danger },
              { icon: '🏥', label: 'Nearest Hospital', action: () => {}, color: Colors.primary },
              { icon: '👨‍⚕️', label: 'My Doctor', action: () => {}, color: Colors.teal },
            ].map((a, i) => (
              <TouchableOpacity key={i} style={[styles.quickActionBtn, { borderColor: a.color + '50' }]} onPress={a.action}>
                <Text style={styles.quickActionIcon}>{a.icon}</Text>
                <Text style={[styles.quickActionLabel, { color: a.color }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── GPS Status / Coordinates ───────────────────────────────────── */}
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderEmoji}>🗺️</Text>
            {fetchingLocation ? (
              <>
                <Text style={styles.mapPlaceholderTitle}>Acquiring GPS Signal...</Text>
                <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 5 }} />
              </>
            ) : locationError ? (
              <>
                <Text style={styles.mapPlaceholderTitle}>Location Unavailable</Text>
                <Text style={styles.mapPlaceholderSub}>{locationError} · Click SOS to request again</Text>
              </>
            ) : userLocation ? (
              <>
                <Text style={styles.mapPlaceholderTitle}>Location Sharing Active</Text>
                <Text style={styles.mapPlaceholderSub}>
                  {userLocation.lat.toFixed(4)}° N, {userLocation.lng.toFixed(4)}° E · Accuracy: High
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.mapPlaceholderTitle}>GPS Offline</Text>
                <Text style={styles.mapPlaceholderSub}>No location captured yet</Text>
              </>
            )}
          </View>

          {/* ── Emergency Profile ─────────────────────────────────────────── */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>🏥 Emergency Profile</Text>
            <TouchableOpacity style={styles.editBtn} onPress={openProfileModal}>
              <Text style={styles.editBtnText}>✏️ Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.profileCard}>
            <View style={styles.profileGrid}>
              <View style={styles.profileCell}>
                <Text style={styles.profileLabel}>BLOOD GROUP</Text>
                <Text style={styles.profileValue}>{profile?.blood_group || '—'}</Text>
              </View>
              <View style={styles.profileCell}>
                <Text style={styles.profileLabel}>PREFERRED HOSPITAL</Text>
                <Text style={styles.profileValue} numberOfLines={2}>{profile?.preferred_hospital || '—'}</Text>
              </View>
            </View>
            {profile?.allergies ? (
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>ALLERGIES</Text>
                <Text style={styles.profileValue}>{profile.allergies}</Text>
              </View>
            ) : null}
            {profile?.emergency_contacts?.map((c, i) => (
              <View key={i} style={styles.contactCard}>
                <View style={styles.contactIconWrap}>
                  <Text style={styles.contactIcon}>📞</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactName}>{c.name} ({c.relation})</Text>
                  <Text style={styles.contactPhone}>{c.phone}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.callBtn}
                  onPress={() => {
                    if (Platform.OS === 'android') {
                      const { PermissionsAndroid, NativeModules } = require('react-native');
                      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CALL_PHONE).then((res: any) => {
                        if (res === PermissionsAndroid.RESULTS.GRANTED && NativeModules.DirectCallSms?.makeDirectCall) {
                          NativeModules.DirectCallSms.makeDirectCall(c.phone).catch((err: any) => console.error(err));
                        } else {
                          Linking.openURL(`tel:${c.phone}`).catch((err: any) => console.error('Call failed:', err));
                        }
                      }).catch((err: any) => console.error(err));
                    } else {
                      Linking.openURL(`tel:${c.phone}`).catch(err => console.error('Call failed:', err));
                    }
                  }}
                >
                  <Text style={styles.callBtnText}>Call Now</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* ── Red Flag Symptoms ──────────────────────────────────────────── */}
          <Text style={styles.sectionTitle}>🚩 Red-Flag Symptoms</Text>
          <Text style={styles.rfDisclaimer}>
            General awareness guide only — NOT a diagnostic tool. Always call a doctor or emergency services when in doubt.
          </Text>

          {/* Severity filter */}
          <View style={styles.filterRow}>
            {[null, 'critical', 'urgent', 'moderate'].map((s) => {
              const isActive = filterSeverity === s;
              const meta = s ? SEV_META[s] : null;
              return (
                <TouchableOpacity
                  key={s ?? 'all'}
                  style={[styles.filterBtn, isActive && { backgroundColor: meta?.color ?? Colors.primary, borderColor: meta?.color ?? Colors.primary }]}
                  onPress={() => setFilterSeverity(s)}
                >
                  <Text style={[styles.filterBtnText, isActive && { color: '#fff' }]}>
                    {s ? (SEV_META[s]?.icon + ' ' + s.charAt(0).toUpperCase() + s.slice(1)) : 'All'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {filtered.map((rf, i) => {
            const meta = SEV_META[rf.severity] || { color: Colors.info, bg: Colors.skyBlueBg, icon: '🔵', label: rf.severity.toUpperCase() };
            return (
              <View key={i} style={[styles.rfCard, { borderLeftColor: meta.color, backgroundColor: meta.bg }]}>
                <View style={styles.rfHeader}>
                  <Text style={styles.rfSevIcon}>{meta.icon}</Text>
                  <View style={[styles.rfSevBadge, { backgroundColor: meta.color + '25', borderColor: meta.color + '50' }]}>
                    <Text style={[styles.rfSevText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>
                <Text style={styles.rfSymptom}>{rf.symptom}</Text>
                <View style={styles.rfActionRow}>
                  <Text style={styles.rfActionArrow}>→</Text>
                  <Text style={styles.rfAction}>{rf.action}</Text>
                </View>
              </View>
            );
          })}

          {/* Ambulance tracking placeholder */}
          <View style={styles.ambulancePlaceholder}>
            <Text style={styles.ambulanceEmoji}>🚑</Text>
            <Text style={styles.ambulanceTitle}>Ambulance Tracking</Text>
            <Text style={styles.ambulanceSub}>Coming soon — real-time ambulance tracking integration</Text>
          </View>

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>

        {/* Edit Profile Modal */}
        <Modal visible={profileModal} animationType="slide" transparent>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          >
            <View style={styles.modalOverlay}>
              <ScrollView keyboardShouldPersistTaps="handled">
                <View style={styles.modalContent}>
                  <View style={styles.modalHandle} />
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>🏥 Emergency Profile</Text>
                    <TouchableOpacity onPress={() => setProfileModal(false)} style={styles.modalClose}>
                      <Text style={styles.modalCloseText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  {[
                    { label: 'Blood Group', key: 'blood_group', placeholder: 'e.g. O+, A-, B+' },
                    { label: 'Allergies', key: 'allergies', placeholder: 'e.g. Penicillin, Latex' },
                    { label: 'Preferred Hospital', key: 'preferred_hospital', placeholder: 'Hospital name & location' },
                    { label: 'Emergency Contact Name', key: 'contact_name', placeholder: 'e.g. Rahul Sharma' },
                    { label: 'Contact Phone', key: 'contact_phone', placeholder: '+91 XXXXXXXXXX' },
                    { label: 'Relationship', key: 'contact_relation', placeholder: 'e.g. Husband, Mother' },
                  ].map(({ label, key, placeholder }) => (
                    <View key={key} style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{label}</Text>
                      <TextInput
                        style={styles.input}
                        placeholder={placeholder}
                        placeholderTextColor={Colors.textMuted}
                        value={(profileForm as any)[key]}
                        onChangeText={(v) => setProfileForm(f => ({ ...f, [key]: v }))}
                      />
                    </View>
                  ))}
                  <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}>
                    <Text style={styles.saveBtnText}>Save Emergency Profile</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F5' },
  inner: { padding: Spacing.md },
  center: { flex: 1, backgroundColor: '#FFF5F5', justifyContent: 'center', alignItems: 'center' },

  emergencyBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: Colors.goldBg, borderRadius: Radius.md,
    padding: Spacing.sm, borderWidth: 1, borderColor: Colors.warning + '40',
    marginBottom: Spacing.lg,
  },
  emergencyBannerIcon: { fontSize: 16 },
  emergencyBannerText: { ...Typography.caption, color: Colors.textSecondary, flex: 1, lineHeight: 18 },

  // SOS Button
  sosBtnWrap: { alignItems: 'center', marginBottom: Spacing.lg, paddingVertical: Spacing.md },
  sosRing: {
    position: 'absolute' as any,
    borderRadius: 9999,
    backgroundColor: Colors.danger,
  },
  sosRingOuter: { width: 200, height: 200, top: -10, left: '50%' as any, marginLeft: -100 },
  sosRingMid:   { width: 170, height: 170, top: 5,   left: '50%' as any, marginLeft: -85 },
  sosBtn: {
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: Colors.danger,
    justifyContent: 'center', alignItems: 'center',
    ...Shadows.sos,
    zIndex: 10,
  },
  sosBtnIcon: { fontSize: 40, marginBottom: 6 },
  sosBtnTitle: { color: '#fff', fontSize: 18, fontWeight: '900' as const, letterSpacing: 1 },
  sosBtnSub: { ...Typography.micro, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 4 },

  sosSuccess: {
    alignItems: 'center', backgroundColor: Colors.mintBg,
    borderRadius: Radius.xl, padding: Spacing.xl, marginBottom: Spacing.lg,
    borderWidth: 1.5, borderColor: Colors.mint,
  },
  sosSuccessEmoji: { fontSize: 52, marginBottom: Spacing.sm },
  sosSuccessTitle: { ...Typography.h2, color: Colors.mint, marginBottom: 6 },
  sosSuccessText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  resetBtn: {
    marginTop: Spacing.md, backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.full, paddingHorizontal: 24, paddingVertical: 10,
  },
  resetBtnText: { ...Typography.body, color: Colors.textMuted },

  closestHospitalCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, marginTop: Spacing.md,
    borderWidth: 1, borderColor: Colors.danger + '40',
    width: '100%', ...Shadows.sm,
  },
  closestHospitalHeader: { ...Typography.captionBold, color: Colors.danger, marginBottom: 4 },
  closestHospitalName: { ...Typography.bodyBold, color: Colors.textPrimary, fontSize: 16, marginBottom: 4 },
  closestHospitalAddress: { ...Typography.caption, color: Colors.textSecondary, marginBottom: 4 },
  closestHospitalDistance: { ...Typography.caption, color: Colors.textSecondary, marginBottom: 4 },
  closestHospitalPhone: { ...Typography.caption, color: Colors.textSecondary, marginBottom: 8 },
  hospitalCallBtn: {
    backgroundColor: Colors.danger, borderRadius: Radius.md,
    paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center',
  },
  hospitalCallBtnText: { ...Typography.captionBold, color: '#fff' },

  // Quick actions
  quickActionsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  quickActionBtn: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.sm, alignItems: 'center', borderWidth: 1.5,
    ...Shadows.xs,
  },
  quickActionIcon: { fontSize: 22, marginBottom: 4 },
  quickActionLabel: { ...Typography.micro, fontWeight: '700' as const, textAlign: 'center' },

  // Map placeholder
  mapPlaceholder: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.xl, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
    marginBottom: Spacing.lg, ...Shadows.xs,
  },
  mapPlaceholderEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  mapPlaceholderTitle: { ...Typography.h4, color: Colors.textPrimary },
  mapPlaceholderSub: { ...Typography.caption, color: Colors.textMuted, marginTop: 4 },

  // Profile
  sectionHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm,
  },
  sectionTitle: { ...Typography.h3, color: Colors.textPrimary, marginBottom: Spacing.sm },
  editBtn: {
    backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border,
  },
  editBtnText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' as const },

  profileCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.md, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border, ...Shadows.sm,
  },
  profileGrid: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
  profileCell: { flex: 1 },
  profileRow: { marginBottom: Spacing.sm },
  profileLabel: { ...Typography.label, color: Colors.textMuted, marginBottom: 4 },
  profileValue: { ...Typography.bodyBold, color: Colors.textPrimary, fontSize: 15 },

  contactCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.border,
    paddingTop: Spacing.sm, marginTop: Spacing.sm,
  },
  contactIconWrap: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.tealBg, justifyContent: 'center', alignItems: 'center',
  },
  contactIcon: { fontSize: 18 },
  contactName: { ...Typography.bodyBold, color: Colors.textPrimary },
  contactPhone: { ...Typography.caption, color: Colors.teal, marginTop: 2, fontWeight: '600' as const },
  callBtn: {
    backgroundColor: Colors.teal, borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  callBtnText: { ...Typography.caption, color: '#fff', fontWeight: '700' as const },

  // Red Flags
  rfDisclaimer: { ...Typography.caption, color: Colors.textMuted, fontStyle: 'italic', marginBottom: Spacing.md, lineHeight: 18 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md, flexWrap: 'wrap' as const },
  filterBtn: {
    backgroundColor: Colors.surface, borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  filterBtnText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' as const },

  rfCard: {
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4,
    ...Shadows.xs,
  },
  rfHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  rfSevIcon: { fontSize: 14 },
  rfSevBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1 },
  rfSevText: { ...Typography.micro, fontWeight: '800' as const },
  rfSymptom: { ...Typography.bodyBold, color: Colors.textPrimary, marginBottom: 6 },
  rfActionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  rfActionArrow: { color: Colors.danger, fontWeight: '700' as const, fontSize: 14, marginTop: 1 },
  rfAction: { ...Typography.body, color: Colors.textSecondary, flex: 1, lineHeight: 22 },

  // Ambulance placeholder
  ambulancePlaceholder: {
    alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.xl, marginTop: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, ...Shadows.xs,
  },
  ambulanceEmoji: { fontSize: 42, marginBottom: Spacing.sm },
  ambulanceTitle: { ...Typography.h4, color: Colors.textPrimary },
  ambulanceSub: { ...Typography.caption, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(26,10,46,0.6)' },
  modalContent: {
    backgroundColor: Colors.backgroundAlt, borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl, padding: Spacing.lg, marginTop: 60,
    borderTopWidth: 1, borderColor: Colors.border,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { ...Typography.h3, color: Colors.textPrimary },
  modalClose: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.surfaceSecondary, justifyContent: 'center', alignItems: 'center' },
  modalCloseText: { color: Colors.textMuted, fontSize: 14, fontWeight: '700' as const },
  inputGroup: { marginBottom: Spacing.md },
  inputLabel: { ...Typography.label, color: Colors.textMuted, marginBottom: 6 },
  input: {
    backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md,
    padding: Spacing.md, color: Colors.textPrimary,
    ...Typography.body, borderWidth: 1, borderColor: Colors.border,
  },
  saveBtn: {
    backgroundColor: Colors.danger, borderRadius: Radius.full,
    padding: Spacing.md, alignItems: 'center',
    marginTop: Spacing.xs, marginBottom: Spacing.xl,
    ...Shadows.sos,
  },
  saveBtnText: { ...Typography.bodyBold, color: '#fff', fontSize: 15 },

  // Voice Activation styles
  voicePanel: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.xs,
  },
  voicePanelActive: {
    borderColor: Colors.danger + '30',
    backgroundColor: Colors.danger + '05',
  },
  voiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  voiceInfo: {
    flex: 1,
  },
  voiceTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  voiceSubtitle: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  voiceToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  voiceToggleOn: {
    backgroundColor: Colors.danger,
  },
  voiceToggleOff: {
    backgroundColor: Colors.textMuted + '30',
  },
  voiceToggleText: {
    ...Typography.captionBold,
    color: '#fff',
  },
  listeningWaveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border + '40',
    gap: 6,
  },
  waveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.danger,
  },
  listeningText: {
    ...Typography.micro,
    color: Colors.danger,
    fontWeight: '700',
    marginLeft: 4,
  },

  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    marginTop: 6,
    marginBottom: 6,
  },
  badgeActive: {
    backgroundColor: Colors.mintBg,
    borderWidth: 1,
    borderColor: Colors.mint,
  },
  badgeInactive: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeUnsupported: {
    backgroundColor: Colors.coralBg,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  statusBadgeText: {
    ...Typography.micro,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  // Fullscreen Emergency Screen Styles
  emergencyScreenContainer: {
    flex: 1,
    backgroundColor: Colors.danger + '08',
  },
  emergencyScreenInner: {
    padding: Spacing.md,
    paddingTop: Spacing.xl,
  },
  emergencyHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.danger + '10',
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: Colors.danger + '30',
  },
  emergencySirenEmoji: {
    fontSize: 64,
    marginBottom: Spacing.xs,
  },
  emergencyHeadline: {
    ...Typography.h2,
    color: Colors.danger,
    fontWeight: '900' as const,
    textAlign: 'center',
  },
  emergencySubline: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  emergencyMetaCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emergencyMetaTitle: {
    ...Typography.captionBold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  emergencyMetaText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
  },
  emergencyCardGroup: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  emergencyGroupTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    fontSize: 15,
  },
  emergencyContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '40',
    gap: Spacing.sm,
  },
  emergencyContactName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  emergencyContactPhone: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  emergencyRowActions: {
    flexDirection: 'row',
    gap: 6,
  },
  emergencyCallButton: {
    backgroundColor: Colors.danger,
    borderRadius: Radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyBtnLabel: {
    ...Typography.captionBold,
    color: '#fff',
  },
  emptyHelpText: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  emergencyHospitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '40',
    gap: Spacing.sm,
  },
  emergencyHospitalName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  emergencyHospitalMeta: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  nicuBadge: {
    backgroundColor: Colors.tealBg,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  nicuBadgeText: {
    ...Typography.micro,
    color: Colors.teal,
    fontWeight: '700',
  },
  centerPadding: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  cancelSosBtn: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.danger,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  cancelSosBtnText: {
    ...Typography.bodyBold,
    color: Colors.danger,
    fontWeight: '900' as const,
    letterSpacing: 1,
  },
});
