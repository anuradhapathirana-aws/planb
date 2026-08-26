import { useMemo, useState, type ReactNode } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Check, ChevronLeft, GraduationCap, MapPin, Trash2, User } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { VisaStatus } from '@shared/types/student';
import type { StudentProfilePayload } from '@shared/types/studentAuth';
import { colors } from '@shared/theme/tokens';
import { getValidationErrors } from '@shared/lib/serverErrors';
import { fetchMe } from '@/api/auth.api';
import { errorMessage } from '@/api/client';
import {
  deleteProfilePhoto,
  fetchIndustries,
  fetchProfessions,
  updateProfile,
  uploadProfilePhoto,
} from '@/api/profile.api';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateField } from '@/components/ui/DateField';
import { Input } from '@/components/ui/Input';
import { SegmentedToggle } from '@/components/ui/SegmentedToggle';
import { SelectField } from '@/components/ui/SelectField';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';

/** Nobody under 18 may register; the backend enforces the same bound. */
const MIN_AGE_YEARS = 18;

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const setStudent = useAuthStore((state) => state.setStudent);

  const profile = useQuery({ queryKey: ['auth', 'me'], queryFn: fetchMe });

  // Reference lists change rarely, so they are worth holding for a while —
  // students pay for the data that refetches them.
  const industries = useQuery({
    queryKey: ['industries'],
    queryFn: fetchIndustries,
    staleTime: 30 * 60_000,
  });
  const professions = useQuery({
    queryKey: ['professions'],
    queryFn: fetchProfessions,
    staleTime: 30 * 60_000,
  });

  const student = profile.data;

  /*
   * Local edits, seeded lazily from the server copy. Deliberately NOT synced
   * from the query in a useEffect: a background refetch mid-edit would wipe
   * whatever the student was typing. `null` also doubles as "nothing changed
   * yet", which drives the Save button and the discard prompt.
   */
  const [form, setForm] = useState<StudentProfilePayload | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const values: StudentProfilePayload = form ?? {
    full_name: student?.full_name ?? '',
    visa_status: student?.visa_status ?? undefined,
    address: student?.address ?? '',
    date_of_birth: student?.date_of_birth ?? null,
    highest_qualification: student?.highest_qualification ?? '',
    industry_id: student?.industry?.id ?? null,
    profession_id: student?.profession?.id ?? null,
  };

  function set<K extends keyof StudentProfilePayload>(key: K, value: StudentProfilePayload[K]) {
    setForm({ ...values, [key]: value });

    // Clear this field's error on edit rather than re-validating per keystroke —
    // an error that changes while you type is noise (root CLAUDE.md §8).
    setErrors((previous) => {
      if (!(key in previous)) return previous;

      const next = { ...previous };
      delete next[key as string];

      return next;
    });
  }

  /* A profession only means anything inside its industry. */
  const professionOptions = useMemo(() => {
    if (!values.industry_id) return [];

    return (professions.data ?? []).filter(
      (option) => option.industry_id === values.industry_id,
    );
  }, [professions.data, values.industry_id]);

  const save = useMutation({
    mutationFn: () => updateProfile(values),
    onSuccess: (updated) => {
      setStudent(updated);
      queryClient.setQueryData(['auth', 'me'], updated);

      toast.success(t('profile.saved'));
      router.back();
    },
    onError: (error) => {
      /*
       * Put 422s on the field that caused them. Anything the form does not
       * render falls back to a toast, so a rule the student cannot see is still
       * reported instead of silently swallowed.
       */
      const serverErrors = getValidationErrors(error);

      if (!serverErrors) {
        toast.error(errorMessage(error, t('common.genericError')));
        return;
      }

      const mapped: Record<string, string> = {};
      const orphaned: string[] = [];

      for (const [field, messages] of Object.entries(serverErrors)) {
        const message = messages[0];
        if (!message) continue;

        // Laravel reports nested members as "languages_spoken.0".
        const root = field.split('.')[0] ?? field;

        if (root in values) mapped[root] = message;
        else orphaned.push(message);
      }

      setErrors(mapped);

      if (orphaned.length > 0) toast.error(orphaned[0] as string);
      else if (Object.keys(mapped).length === 0) toast.error(t('common.genericError'));
    },
  });

  const photo = useMutation({
    mutationFn: (uri: string | null) => (uri ? uploadProfilePhoto(uri) : deleteProfilePhoto()),
    onSuccess: (updated, uri) => {
      setStudent(updated);
      queryClient.setQueryData(['auth', 'me'], updated);

      toast.success(uri ? t('profile.photoUpdated') : t('profile.photoRemoved'));
    },
    onError: (error) => toast.error(errorMessage(error, t('common.genericError'))),
  });

  async function pickPhoto(fromCamera: boolean) {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      toast.error(t('profile.photoPermission'));
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      // Square, because the avatar is a circle everywhere it appears.
      aspect: [1, 1],
      /*
       * The backend re-encodes to 600x600 regardless, so uploading a 12MP
       * original would only be slow and expensive on a Sri Lankan mobile
       * connection.
       */
      quality: 0.8,
    };

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

    const asset = result.canceled ? null : result.assets[0];

    if (asset) photo.mutate(asset.uri);
  }

  function choosePhotoSource() {
    Alert.alert(t('profile.changePhotoAction'), undefined, [
      { text: t('profile.takePhoto'), onPress: () => void pickPhoto(true) },
      { text: t('profile.choosePhoto'), onPress: () => void pickPhoto(false) },
      ...(student?.profile_photo_url
        ? [
            {
              text: t('profile.removePhoto'),
              style: 'destructive' as const,
              onPress: () => photo.mutate(null),
            },
          ]
        : []),
      { text: t('common.cancel'), style: 'cancel' as const },
    ]);
  }

  function leave() {
    // Nothing typed, nothing to lose.
    if (!form) {
      router.back();
      return;
    }

    Alert.alert(t('profile.unsavedTitle'), t('profile.unsavedBody'), [
      { text: t('profile.keepEditing'), style: 'cancel' },
      { text: t('profile.discard'), style: 'destructive', onPress: () => router.back() },
    ]);
  }

  const maxDob = new Date();
  maxDob.setFullYear(maxDob.getFullYear() - MIN_AGE_YEARS);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-row items-center gap-2 px-3 pb-2" style={{ paddingTop: insets.top + 4 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={12}
          onPress={leave}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-muted"
        >
          <ChevronLeft size={24} color={colors.foreground} />
        </Pressable>

        <Text variant="title" className="flex-1">
          {t('profile.editTitle')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        contentContainerClassName="px-5 pt-2 gap-5"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card className="items-center p-5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('profile.changePhotoAction')}
            onPress={choosePhotoSource}
            disabled={photo.isPending}
            className="items-center active:opacity-80"
          >
            <View>
              <Avatar uri={student?.profile_photo_url} name={student?.full_name} size={96} />

              {/* The badge is what makes the avatar read as tappable. */}
              <View className="absolute -bottom-1 -right-1 h-9 w-9 items-center justify-center rounded-full border-2 border-card bg-accent">
                <Camera size={16} color={colors['accent-foreground']} />
              </View>
            </View>

            <Text className="mt-3 font-semibold text-primary">
              {photo.isPending ? t('common.loading') : t('profile.changePhotoAction')}
            </Text>
          </Pressable>

          {student?.profile_photo_url && !photo.isPending && (
            <Button
              label={t('profile.removePhoto')}
              variant="ghost"
              size="sm"
              icon={Trash2}
              className="mt-1"
              onPress={() =>
                Alert.alert(t('profile.removePhotoConfirm'), undefined, [
                  { text: t('common.cancel'), style: 'cancel' },
                  {
                    text: t('profile.removePhoto'),
                    style: 'destructive',
                    onPress: () => photo.mutate(null),
                  },
                ])
              }
            />
          )}
        </Card>

        <Section icon={User} title={t('profile.sectionIdentity')}>
          <Input
            label={t('profile.fullName')}
            placeholder={t('profile.fullNamePlaceholder')}
            value={values.full_name ?? ''}
            onChangeText={(text) => set('full_name', text)}
            error={errors.full_name}
            hint={t('profile.nameNotice')}
            required
            autoCapitalize="words"
          />

          <DateField
            label={t('profile.dateOfBirth')}
            placeholder={t('profile.dobPlaceholder')}
            value={values.date_of_birth ?? null}
            onChange={(value) => set('date_of_birth', value)}
            error={errors.date_of_birth}
            maximumDate={maxDob}
          />

          <SegmentedToggle<VisaStatus>
            label={t('profile.visaStatus')}
            value={values.visa_status ?? null}
            onChange={(value) => set('visa_status', value)}
            error={errors.visa_status}
            options={[
              { value: 'visit', label: t('profile.visaVisit') },
              { value: 'employment', label: t('profile.visaEmployment') },
            ]}
          />
        </Section>

        <Section icon={MapPin} title={t('profile.sectionContact')}>
          <Input
            label={t('profile.address')}
            placeholder={t('profile.addressPlaceholder')}
            value={values.address ?? ''}
            onChangeText={(text) => set('address', text)}
            error={errors.address}
            multiline
          />

          {/*
            Phone and email are read-only here on purpose: both are credentials.
            Changing the phone requires an SMS code sent to the NEW number, which
            is its own flow — showing an editable field that silently fails to
            save would be worse than showing it locked with the reason.
          */}
          <ReadOnlyRow
            label={t('profile.contactNumber')}
            value={student?.contact_number ?? t('common.notSet')}
            note={t('profile.phoneLocked')}
          />

          <ReadOnlyRow
            label={t('auth.emailLabel')}
            value={student?.email ?? t('common.notSet')}
            note={t('profile.emailLocked')}
          />
        </Section>

        <Section icon={GraduationCap} title={t('profile.sectionCareer')}>
          <Input
            label={t('profile.qualification')}
            placeholder={t('profile.qualificationPlaceholder')}
            value={values.highest_qualification ?? ''}
            onChangeText={(text) => set('highest_qualification', text)}
            error={errors.highest_qualification}
          />

          <SelectField
            label={t('profile.industry')}
            placeholder={t('profile.industryPlaceholder')}
            value={values.industry_id ?? null}
            options={industries.data ?? []}
            error={errors.industry_id}
            onChange={(id) => {
              /*
               * Clear the profession too. Keeping one from the previous industry
               * would fail the backend's cross-field rule, and the student would
               * get an error about a field they never touched.
               */
              setForm({ ...values, industry_id: id, profession_id: null });
              setErrors({});
            }}
          />

          <SelectField
            label={t('profile.profession')}
            placeholder={t('profile.professionPlaceholder')}
            value={values.profession_id ?? null}
            options={professionOptions}
            error={errors.profession_id}
            disabled={!values.industry_id}
            hint={!values.industry_id ? t('profile.professionNeedsIndustry') : undefined}
            onChange={(id) => set('profession_id', id)}
          />
        </Section>
      </ScrollView>

      {/* Pinned: a long form must never hide its own submit button. */}
      <View
        className="absolute bottom-0 left-0 right-0 border-t border-border bg-card px-5 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button
          label={t('common.save')}
          size="lg"
          fullWidth
          icon={Check}
          loading={save.isPending}
          disabled={!form || profile.isLoading}
          onPress={() => save.mutate()}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof User;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="gap-4 p-4">
      <View className="flex-row items-center gap-2">
        <Icon size={15} color={colors['muted-foreground']} />
        <Text variant="label">{title}</Text>
      </View>

      {children}
    </Card>
  );
}

function ReadOnlyRow({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <View>
      <Text variant="label" className="mb-1.5 text-foreground">
        {label}
      </Text>

      <View className="min-h-[52px] justify-center rounded-lg border border-border bg-muted px-3.5 py-3">
        <Text className="text-muted-foreground">{value}</Text>
      </View>

      <Text variant="caption" className="mt-1.5 leading-5">
        {note}
      </Text>
    </View>
  );
}
