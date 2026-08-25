import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';
import type { BusinessRecord } from './BusinessSetup';

export type MenuRecord = {
  id: string;
  user_id: string;
  business_id: string;
  name: string;
  description: string | null;
  price: number;
  image_path: string | null;
  category: string | null;
  is_available: boolean;
  image_url?: string | null;
};

type Props = {
  visible: boolean;
  session: Session;
  business: BusinessRecord;
  editingMenu?: MenuRecord | null;
  onClose: () => void;
  onSaved: (menu: MenuRecord) => void;
};

function formatNumberInput(value: string) {
  if (!value) return '';
  return new Intl.NumberFormat('id-ID').format(Number(value));
}

export default function MenuForm({
  visible,
  session,
  business,
  editingMenu = null,
  onClose,
  onSaved,
}: Props) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;

    setName(editingMenu?.name ?? '');
    setPrice(editingMenu ? String(editingMenu.price) : '');
    setCategory(editingMenu?.category ?? '');
    setDescription(editingMenu?.description ?? '');
    setImage(null);
    setRemoveExistingImage(false);
  }, [visible, editingMenu]);

  function resetForm() {
    setName('');
    setPrice('');
    setCategory('');
    setDescription('');
    setImage(null);
    setRemoveExistingImage(false);
  }

  function handleClose() {
    if (loading) return;
    resetForm();
    onClose();
  }

  async function pickImage() {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Izin galeri diperlukan',
        'Izinkan akses foto agar gambar menu dapat dipilih.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
      setRemoveExistingImage(false);
    }
  }

  function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message: unknown }).message);
    }
    return 'Terjadi kesalahan yang belum diketahui.';
  }

  async function handleSave() {
    const normalizedName = name.trim();
    const numericPrice = Number(price);

    if (!normalizedName) {
      Alert.alert('Nama menu belum diisi', 'Masukkan nama produk jualan.');
      return;
    }

    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      Alert.alert('Harga belum sesuai', 'Masukkan harga jual lebih dari Rp0.');
      return;
    }

    setLoading(true);
    let uploadedImagePath: string | null = null;
    let finalImagePath = removeExistingImage
      ? null
      : editingMenu?.image_path ?? null;

    try {
      if (image) {
        if (!image.base64) {
          throw new Error('Data foto tidak terbaca. Silakan pilih ulang foto.');
        }

        const uniqueName = String(Date.now()) + '-' + Math.random().toString(36).slice(2);
        uploadedImagePath =
          session.user.id + '/' + business.id + '/' + uniqueName + '.jpg';

        const { error: uploadError } = await supabase.storage
          .from('menu-images')
          .upload(uploadedImagePath, decode(image.base64), {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;
        finalImagePath = uploadedImagePath;
      }

      const menuValues = {
        name: normalizedName,
        description: description.trim() || null,
        price: numericPrice,
        image_path: finalImagePath,
        category: category.trim() || null,
      };

      const columns =
        'id, user_id, business_id, name, description, price, image_path, category, is_available';

      const saveResult = editingMenu
        ? await supabase
            .from('menus')
            .update(menuValues)
            .eq('id', editingMenu.id)
            .eq('user_id', session.user.id)
            .eq('business_id', business.id)
            .select(columns)
            .single()
        : await supabase
            .from('menus')
            .insert({
              ...menuValues,
              user_id: session.user.id,
              business_id: business.id,
              is_available: true,
            })
            .select(columns)
            .single();

      const { data, error } = saveResult;

      if (error) throw error;

      let imageUrl: string | null = null;
      if (finalImagePath) {
        const { data: signedData } = await supabase.storage
          .from('menu-images')
          .createSignedUrl(finalImagePath, 60 * 60);
        imageUrl = signedData?.signedUrl ?? null;
      }

      if (
        editingMenu?.image_path &&
        editingMenu.image_path !== finalImagePath
      ) {
        await supabase.storage
          .from('menu-images')
          .remove([editingMenu.image_path]);
      }

      onSaved({
        ...(data as MenuRecord),
        price: Number(data.price),
        image_url: imageUrl,
      });
      resetForm();
      onClose();
    } catch (error) {
      if (uploadedImagePath) {
        await supabase.storage.from('menu-images').remove([uploadedImagePath]);
      }

      Alert.alert(
        editingMenu ? 'Gagal memperbarui menu' : 'Gagal menambah menu',
        getErrorMessage(error)
      );
    } finally {
      setLoading(false);
    }
  }

  const previewUri =
    image?.uri ??
    (!removeExistingImage ? editingMenu?.image_url ?? null : null);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>
                {editingMenu ? 'EDIT MENU' : 'MENU BARU'}
              </Text>
              <Text style={styles.title}>
                {editingMenu ? 'Perbarui produk' : 'Tambah produk'}
              </Text>
            </View>
            <Pressable style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeText}>Tutup</Text>
            </Pressable>
          </View>

          <Pressable style={styles.imagePicker} onPress={pickImage}>
            {previewUri ? (
              <Image source={{ uri: previewUri }} style={styles.preview} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imageIcon}>＋</Text>
                <Text style={styles.imageTitle}>Tambah foto menu</Text>
                <Text style={styles.imageHint}>Opsional · rasio 4:3</Text>
              </View>
            )}
          </Pressable>

          {previewUri ? (
            <View style={styles.imageActions}>
              <Pressable style={styles.changeImage} onPress={pickImage}>
                <Text style={styles.changeImageText}>Ganti foto</Text>
              </Pressable>
              <Pressable
                style={styles.removeImage}
                onPress={() => {
                  setImage(null);
                  setRemoveExistingImage(true);
                }}
              >
                <Text style={styles.removeImageText}>Hapus foto</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Nama menu</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Contoh: Ayam Teriyaki"
              placeholderTextColor="#655E70"
              maxLength={80}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Harga jual</Text>
            <View style={styles.moneyInput}>
              <Text style={styles.currency}>Rp</Text>
              <TextInput
                style={styles.moneyField}
                value={formatNumberInput(price)}
                onChangeText={(value) => setPrice(value.replace(/[^0-9]/g, ''))}
                placeholder="0"
                placeholderTextColor="#655E70"
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Kategori</Text>
            <TextInput
              style={styles.input}
              value={category}
              onChangeText={setCategory}
              placeholder="Contoh: Makanan"
              placeholderTextColor="#655E70"
              maxLength={40}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Deskripsi</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Keterangan singkat (opsional)"
              placeholderTextColor="#655E70"
              maxLength={180}
              multiline
            />
          </View>

          <Pressable
            style={[styles.saveButton, loading && styles.disabledButton]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveText}>
                {editingMenu ? 'Simpan perubahan' : 'Simpan menu'}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09070F' },
  content: { paddingHorizontal: 22, paddingTop: 54, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 26,
  },
  eyebrow: { color: '#B98CFF', fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: '#FFFFFF', fontSize: 27, fontWeight: '800', marginTop: 5 },
  closeButton: {
    borderWidth: 1,
    borderColor: '#3B3148',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  closeText: { color: '#D0C8D8', fontSize: 12, fontWeight: '700' },
  imagePicker: {
    height: 190,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#15111D',
    borderWidth: 1,
    borderColor: '#332A40',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  preview: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imageIcon: { color: '#B98CFF', fontSize: 34, fontWeight: '300' },
  imageTitle: { color: '#E8E1EE', fontSize: 15, fontWeight: '700', marginTop: 7 },
  imageHint: { color: '#756E7E', fontSize: 11, marginTop: 5 },
  imageActions: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 18 },
  changeImage: { marginLeft: 16 },
  changeImageText: { color: '#B98CFF', fontSize: 12, fontWeight: '700' },
  removeImage: { marginLeft: 16 },
  removeImageText: { color: '#F59E9E', fontSize: 12, fontWeight: '700' },
  field: { marginBottom: 18 },
  label: { color: '#E4DFEA', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  input: {
    backgroundColor: '#15111D',
    borderWidth: 1,
    borderColor: '#332A40',
    borderRadius: 13,
    color: '#FFFFFF',
    fontSize: 15,
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  textArea: { minHeight: 92, textAlignVertical: 'top' },
  moneyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15111D',
    borderWidth: 1,
    borderColor: '#332A40',
    borderRadius: 13,
    paddingHorizontal: 15,
  },
  currency: { color: '#B98CFF', fontSize: 15, fontWeight: '800', marginRight: 9 },
  moneyField: { flex: 1, color: '#FFFFFF', fontSize: 17, fontWeight: '700', paddingVertical: 14 },
  saveButton: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    marginTop: 4,
  },
  disabledButton: { opacity: 0.65 },
  saveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
