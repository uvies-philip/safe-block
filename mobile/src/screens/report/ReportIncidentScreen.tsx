import * as Location from 'expo-location';
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnonymousToggleRow } from '../../components/report/AnonymousToggleRow';
import { ImageUploadField } from '../../components/report/ImageUploadField';
import { QuickReportChips } from '../../components/report/QuickReportChips';
import { VoiceReportInput } from '../../components/report/VoiceReportInput';
import { AppButton } from '../../components/ui/AppButton';
import { AppInput } from '../../components/ui/AppInput';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { loadIncidentDrafts, removeIncidentDraft, saveIncidentDraft, submitIncident, syncAllDrafts } from '../../redux/slices/incidentsSlice';
import { IncidentDraft, IncidentType } from '../../types';
import { incidentMeta } from '../../utils/format';
import { theme } from '../../utils/theme';

const MIN_DESCRIPTION = 5;
const MAX_DESCRIPTION = 280;

const QUICK_TEMPLATES: Record<IncidentType, string> = {
  ROBBERY: 'Robbery happening now. Stay alert and avoid this area.',
  KIDNAPPING: 'Suspected kidnapping incident in progress.',
  FIRE: 'Fire outbreak detected. Emergency response needed.',
  POLICE_EXTORTION: 'Police extortion checkpoint reported here.',
  ROADBLOCK: 'Roadblock and heavy disruption reported.',
  ACCIDENT: 'Road accident reported. Slow down and reroute.',
  SUSPICIOUS_ACTIVITY: 'Suspicious activity observed nearby.',
};

export const ReportIncidentScreen = ({ navigation }: any) => {
  const dispatch = useAppDispatch();
  const submitting = useAppSelector((state) => state.incidents.loading);
  const draftQueue = useAppSelector((state) => state.incidents.draftQueue);
  const syncingDrafts = useAppSelector((state) => state.incidents.syncingDrafts);

  const [type, setType] = useState<IncidentType>('ROBBERY');
  const [description, setDescription] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [location, setLocation] = useState({ latitude: 6.5244, longitude: 3.3792 });
  const [locationHint, setLocationHint] = useState('Detecting your location…');
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  useEffect(() => {
    dispatch(loadIncidentDrafts());
    dispatch(syncAllDrafts()).then(() => dispatch(loadIncidentDrafts()));
  }, [dispatch]);

  useEffect(() => {
    let active = true;

    const detect = async () => {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        if (active) {
          setLocationHint('Location permission denied. Using default Lagos location.');
        }
        return;
      }

      try {
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (active) {
          setLocation({ latitude: current.coords.latitude, longitude: current.coords.longitude });
          setLocationHint('Live location ready');
        }
      } catch {
        const fallback = await Location.getLastKnownPositionAsync();
        if (fallback && active) {
          setLocation({ latitude: fallback.coords.latitude, longitude: fallback.coords.longitude });
          setLocationHint('Using last known location');
        }
      }
    };

    detect().catch(() => {
      if (active) {
        setLocationHint('Location unavailable. You can still submit quickly.');
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const descriptionError =
    touched && description.trim().length < MIN_DESCRIPTION
      ? `Add at least ${MIN_DESCRIPTION} characters so others can react safely.`
      : null;

  const canSubmit = description.trim().length >= MIN_DESCRIPTION && !submitting && !submitted;

  const estimatedTime = useMemo(() => {
    if (description.trim().length >= MIN_DESCRIPTION) {
      return '<10 sec ready';
    }

    return 'Add a short description';
  }, [description]);

  const handleQuickType = (entry: IncidentType) => {
    setType(entry);
    if (description.trim().length < MIN_DESCRIPTION) {
      setDescription(QUICK_TEMPLATES[entry]);
      setTouched(true);
    }
  };

  const selectedMeta = incidentMeta(type);

  const pendingDrafts = draftQueue.filter((d) => d.status === 'pending' || d.status === 'failed');

  const handleSaveDraft = async () => {
    if (description.trim().length < MIN_DESCRIPTION) return;
    await dispatch(saveIncidentDraft({ type, description: description.trim(), anonymous, imageUri: imageUri ?? undefined, location }));
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2500);
  };

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.successTitle}>Report submitted</Text>
        <Text style={styles.successBody}>Your incident has been shared with the community. Thank you for keeping everyone safe.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.heading}>Report an incident</Text>

            {pendingDrafts.length > 0 ? (
              <View style={styles.draftBanner}>
                <View style={styles.draftBannerLeft}>
                  <Text style={styles.draftBannerTitle}>{pendingDrafts.length} draft{pendingDrafts.length > 1 ? 's' : ''} saved offline</Text>
                  <Text style={styles.draftBannerSub}>{syncingDrafts ? 'Syncing…' : 'Will sync when online'}</Text>
                </View>
                {!syncingDrafts ? (
                  <Pressable onPress={() => dispatch(syncAllDrafts()).then(() => dispatch(loadIncidentDrafts()))} style={styles.draftSyncBtn}>
                    <Text style={styles.draftSyncBtnText}>Sync</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {draftSaved ? (
              <View style={styles.draftToast}>
                <Text style={styles.draftToastText}>Draft saved — will sync when online</Text>
              </View>
            ) : null}

            <Text style={styles.subheading}>Fast mode for Nigerian streets: tap, speak, attach, send.</Text>

            <View style={styles.fastBanner}>
              <Text style={styles.fastBadge}>⚡ {estimatedTime}</Text>
              <Text style={styles.fastHint}>{locationHint}</Text>
            </View>

            <Text style={styles.fieldLabel}>One-tap quick report</Text>
            <QuickReportChips selectedType={type} onSelectType={handleQuickType} />

          <View style={[styles.selectedBanner, { borderColor: `${selectedMeta.color}55`, backgroundColor: `${selectedMeta.color}12` }]}>
            <Text style={[styles.selectedBannerText, { color: selectedMeta.color }]}>
              {selectedMeta.icon}  {selectedMeta.label}
            </Text>
          </View>

            <VoiceReportInput onTranscript={(text) => {
              setDescription((prev) => {
                const merged = prev ? `${prev} ${text}` : text;
                return merged.slice(0, MAX_DESCRIPTION);
              });
              setTouched(true);
            }} />

            <AnonymousToggleRow value={anonymous} onChange={setAnonymous} />

            <ImageUploadField value={imageUri} onChange={setImageUri} />

          <AppInput
            label="Description"
            multiline
            placeholder="What happened? Keep it short and useful."
            style={styles.textArea}
            value={description}
            onChangeText={(v) => {
              setDescription(v.slice(0, MAX_DESCRIPTION));
              setTouched(true);
            }}
            containerStyle={styles.textAreaContainer}
          />
          <View style={styles.charRow}>
            {descriptionError ? (
              <Text style={styles.errorText}>{descriptionError}</Text>
            ) : (
              <Text style={styles.charHint}>
                {description.trim().length >= MIN_DESCRIPTION ? '✓ Ready to dispatch' : `${MIN_DESCRIPTION - description.trim().length} more characters needed`}
              </Text>
            )}
            <Text style={[
              styles.charCount,
              description.length > MAX_DESCRIPTION * 0.9 ? styles.charCountWarn : null,
            ]}>
              {description.length}/{MAX_DESCRIPTION}
            </Text>
          </View>

          <AppButton
            label={submitting ? 'Sending report…' : 'Send now'}
            loading={submitting}
            disabled={!canSubmit}
            onPress={async () => {
              setTouched(true);
              if (!canSubmit) return;
              await dispatch(
                submitIncident({
                  type,
                  description: description.trim(),
                  anonymous,
                  imageUri: imageUri ?? undefined,
                  location,
                })
              );
              setSubmitted(true);
              setTimeout(() => navigation.goBack(), 900);
            }}
            style={styles.button}
          />

          <Pressable
            onPress={handleSaveDraft}
            disabled={description.trim().length < MIN_DESCRIPTION}
            style={[styles.saveDraftBtn, description.trim().length < MIN_DESCRIPTION ? styles.saveDraftBtnDisabled : null]}
          >
            <Text style={styles.saveDraftBtnText}>Save as draft</Text>
          </Pressable>

          <Text style={styles.footerHint}>Reports with strong detail and community verification increase your credibility score.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    flexGrow: 1,
    padding: theme.spacing.lg,
    paddingBottom: 48,
  },
  draftBanner: {
    alignItems: 'center',
    backgroundColor: `${theme.colors.warning}18`,
    borderColor: `${theme.colors.warning}55`,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    padding: 10,
  },
  draftBannerLeft: {
    flex: 1,
  },
  draftBannerTitle: {
    color: theme.colors.warning,
    fontSize: 13,
    fontWeight: '700',
  },
  draftBannerSub: {
    color: theme.colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  draftSyncBtn: {
    backgroundColor: theme.colors.warning,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  draftSyncBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
  },
  draftToast: {
    backgroundColor: `${theme.colors.success}22`,
    borderColor: `${theme.colors.success}55`,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    marginBottom: 10,
    padding: 8,
  },
  draftToastText: {
    color: theme.colors.success,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  saveDraftBtn: {
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  saveDraftBtnDisabled: {
    opacity: 0.35,
  },
  saveDraftBtnText: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  card: {
    ...theme.elevation.card,
    backgroundColor: theme.colors.cardStrong,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  heading: {
    color: theme.colors.text,
    fontSize: theme.typography.h2,
    fontWeight: '800',
    marginBottom: 8,
  },
  subheading: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  fastBanner: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  fastBadge: {
    color: theme.colors.success,
    fontSize: 12,
    fontWeight: '800',
  },
  fastHint: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  fieldLabel: {
    color: theme.colors.textSoft,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  selectedBanner: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  selectedBannerText: {
    fontSize: 15,
    fontWeight: '700',
  },
  textAreaContainer: {
    marginBottom: 4,
  },
  textArea: {
    minHeight: 130,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  charRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 4,
  },
  charHint: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  charCount: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  charCountWarn: {
    color: theme.colors.warning,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
    marginRight: 8,
  },
  button: {},
  footerHint: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    textAlign: 'center',
  },
  // success state
  successContainer: {
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  successIcon: {
    color: theme.colors.success,
    fontSize: 64,
    marginBottom: 20,
  },
  successTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.h2,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  successBody: {
    color: theme.colors.muted,
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'center',
  },
});
