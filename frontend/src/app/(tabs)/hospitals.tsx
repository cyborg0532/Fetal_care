import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, Linking } from 'react-native';
import * as Location from 'expo-location';
import { apiFetch } from '../../services/api';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../constants/theme';
import DashboardLayout from '../../components/DashboardLayout';
import { GlassCard, SectionHeader, Badge } from '../../components/PremiumUI';

const DOCTORS = [
  {
    name: 'Dr. Priya Sharma',
    specialty: 'Senior OB-GYN & High-Risk Expert',
    experience: '16 yrs exp',
    rating: 4.9,
    reviews: 320,
    hospital: 'St. Jude Mother Care',
    availability: 'Mon - Sat (10:00 - 16:00)',
  },
  {
    name: 'Dr. Anish Deshmukh',
    specialty: 'Obstetrician & Lactation Specialist',
    experience: '12 yrs exp',
    rating: 4.7,
    reviews: 180,
    hospital: 'Apollo Cradle',
    availability: 'Mon - Fri (11:00 - 18:00)',
  }
];

export default function HospitalsScreen() {
  const [activeSegment, setActiveSegment] = useState<'hospitals' | 'doctors'>('hospitals');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Location and dynamic hospitals data states
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const fetchHospitals = useCallback(async (coords: { lat: number; lng: number }) => {
    try {
      const res = await apiFetch(`/sos/nearest-hospitals?lat=${coords.lat}&lng=${coords.lng}`);
      if (res && res.hospitals) {
        setHospitals(res.hospitals);
      }
    } catch (err) {
      console.error("Error fetching hospitals from API:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const getDeviceLocationAndFetch = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Permission to access location was denied');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setUserLocation(coords);
      await fetchHospitals(coords);
    } catch (err: any) {
      setLocationError(err.message || 'Error getting location');
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchHospitals]);

  useEffect(() => {
    getDeviceLocationAndFetch();
  }, [getDeviceLocationAndFetch]);

  const onRefresh = () => {
    setRefreshing(true);
    getDeviceLocationAndFetch();
  };

  const filteredHospitals = hospitals.filter(h =>
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (h.address && h.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredDoctors = DOCTORS.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout title="Hospital & Doctor Intelligence">
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.inner} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>🏥 Hospital & Doctor Intelligence</Text>
          <Text style={styles.pageSub}>Locate nearby verified maternal facilities and check NICU and high-risk routing status</Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={activeSegment === 'hospitals' ? "Search hospitals, locations..." : "Search doctors, specialties..."}
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Segmented Switcher */}
        <View style={styles.segmentRow}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeSegment === 'hospitals' && styles.segmentBtnActive]}
            onPress={() => { setActiveSegment('hospitals'); setSearchQuery(''); }}
          >
            <Text style={[styles.segmentBtnText, activeSegment === 'hospitals' && styles.segmentBtnTextActive]}>
              Hospitals Near Me
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, activeSegment === 'doctors' && styles.segmentBtnActive]}
            onPress={() => { setActiveSegment('doctors'); setSearchQuery(''); }}
          >
            <Text style={[styles.segmentBtnText, activeSegment === 'doctors' && styles.segmentBtnTextActive]}>
              Recommended Doctors
            </Text>
          </TouchableOpacity>
        </View>

        {/* Map Placeholder */}
        <GlassCard style={styles.mapCard}>
          <Text style={styles.mapEmoji}>🗺️</Text>
          <Text style={styles.mapTitle}>Interactive Live Map</Text>
          {userLocation ? (
            <Text style={styles.mapSub}>
              Location sharing active · Centered on {userLocation.lat.toFixed(4)}° N, {userLocation.lng.toFixed(4)}° E
            </Text>
          ) : locationError ? (
            <Text style={styles.mapSub}>Location error: {locationError} · Fallback active</Text>
          ) : (
            <Text style={styles.mapSub}>Acquiring GPS Signal...</Text>
          )}
        </GlassCard>

        {/* Listing */}
        {activeSegment === 'hospitals' ? (
          <View>
            <SectionHeader title="Verified Nearby Facilities" icon="🏥" />
            {loading ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: Spacing.xl }} />
            ) : filteredHospitals.length === 0 ? (
              <Text style={{ textAlign: 'center', color: Colors.textMuted, marginVertical: Spacing.lg }}>
                No hospitals found within 5km of your location.
              </Text>
            ) : (
              filteredHospitals.map((hospital, idx) => (
                <GlassCard key={idx} accent={hospital.nicu ? Colors.teal : Colors.primary}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardName}>{hospital.name}</Text>
                      <Text style={styles.cardAddress}>📍 {hospital.address} ({hospital.distance_km} km)</Text>
                    </View>
                    <View style={styles.ratingBadge}>
                      <Text style={styles.ratingText}>⭐ {hospital.rating}</Text>
                    </View>
                  </View>

                  <View style={styles.badgeRow}>
                    {hospital.nicu && <Badge label="NICU AVAILABLE" color={Colors.teal} />}
                    {hospital.highRisk && <Badge label="HIGH-RISK PREGNANCY ROUTING" color={Colors.primary} />}
                  </View>

                  <View style={styles.cardDivider} />

                  <View style={styles.cardFooter}>
                    <Text style={styles.phoneText}>📞 {hospital.phone}</Text>
                    <TouchableOpacity 
                      style={styles.bookBtn} 
                      onPress={() => hospital.phone && Linking.openURL(`tel:${hospital.phone}`)}
                    >
                      <Text style={styles.bookBtnText}>Call Clinic</Text>
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              ))
            )}
          </View>
        ) : (
          <View>
            <SectionHeader title="Maternal Care Specialists" icon="👩‍⚕️" />
            {filteredDoctors.map((doc, idx) => (
              <GlassCard key={idx} accent={Colors.lavender}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{doc.name}</Text>
                    <Text style={styles.cardAddress}>{doc.specialty} · {doc.experience}</Text>
                  </View>
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>⭐ {doc.rating}</Text>
                  </View>
                </View>

                <Text style={styles.docHospital}>🏥 Primary Facility: {doc.hospital}</Text>
                <Text style={styles.docAvail}>⏰ Available: {doc.availability}</Text>

                <View style={styles.cardDivider} />

                <View style={styles.cardFooter}>
                  <Text style={styles.reviewsText}>💬 {doc.reviews} patient reviews</Text>
                  <TouchableOpacity style={[styles.bookBtn, { backgroundColor: Colors.lavender }]}>
                    <Text style={styles.bookBtnText}>Book Consult</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { padding: Spacing.md },
  pageHeader: { marginBottom: Spacing.md, marginTop: Spacing.sm },
  pageTitle: { ...Typography.h2, color: Colors.textPrimary, fontWeight: '800' as const },
  pageSub: { ...Typography.body, color: Colors.textMuted, marginTop: 4 },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    ...Shadows.xs,
  },
  searchIcon: { fontSize: 16, marginRight: Spacing.xs },
  searchInput: { flex: 1, ...Typography.body, color: Colors.textPrimary },

  segmentRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    padding: Spacing.xs,
    marginBottom: Spacing.md,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  segmentBtnActive: {
    backgroundColor: Colors.surface,
    ...Shadows.xs,
  },
  segmentBtnText: {
    ...Typography.caption,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  segmentBtnTextActive: {
    color: Colors.primary,
  },

  mapCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.skyBlueBg,
    borderColor: Colors.skyBlue + '30',
  },
  mapEmoji: { fontSize: 44, marginBottom: Spacing.sm },
  mapTitle: { ...Typography.h3, color: Colors.textPrimary },
  mapSub: { ...Typography.caption, color: Colors.textMuted, marginTop: 4 },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  cardName: {
    ...Typography.h4,
    color: Colors.textPrimary,
    fontWeight: '700' as const,
  },
  cardAddress: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  ratingBadge: {
    backgroundColor: Colors.goldBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  ratingText: {
    ...Typography.caption,
    fontWeight: '700' as const,
    color: Colors.gold,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    flexWrap: 'wrap' as const,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phoneText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
  bookBtn: {
    backgroundColor: Colors.teal,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  bookBtnText: {
    ...Typography.caption,
    color: '#fff',
    fontWeight: '700' as const,
  },
  docHospital: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  docAvail: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  reviewsText: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
});
