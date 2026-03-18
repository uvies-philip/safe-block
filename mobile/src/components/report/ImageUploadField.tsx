import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../../utils/theme';

type Props = {
  value: string | null;
  onChange: (uri: string | null) => void;
};

export const ImageUploadField = ({ value, onChange }: Props) => {
  const [error, setError] = useState<string | null>(null);

  const pickImage = async () => {
    setError(null);

    const permissions = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissions.status !== 'granted') {
      setError('Photo access is required to attach evidence.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      quality: 0.7,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    const selected = result.assets[0];

    const compressed = await manipulateAsync(
      selected.uri,
      [{ resize: { width: 960 } }],
      { compress: 0.55, format: SaveFormat.JPEG }
    );

    onChange(compressed.uri);
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={pickImage} style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}>
        <Text style={styles.buttonText}>{value ? 'Replace image' : 'Add image (compressed)'}</Text>
      </Pressable>

      {value ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: value }} style={styles.preview} />
          <Pressable onPress={() => onChange(null)} style={styles.removeBtn}>
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  button: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 46,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  previewWrap: {
    marginTop: 10,
  },
  preview: {
    borderRadius: theme.radius.md,
    height: 160,
    width: '100%',
  },
  removeBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  removeText: {
    color: theme.colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  error: {
    color: theme.colors.warning,
    fontSize: 12,
    marginTop: 6,
  },
});
