import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as aesjs from 'aes-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Supabase sessions (JWT + refresh token) routinely exceed SecureStore's
// ~2048 byte per-item limit on Android, so the encrypted session blob lives
// in AsyncStorage and only its small AES-256 key is kept in SecureStore.
class LargeSecureStore {
  private async getKey(name: string): Promise<Uint8Array> {
    const keyName = `${name}_key`;
    const existing = await SecureStore.getItemAsync(keyName);
    if (existing) return aesjs.utils.hex.toBytes(existing);

    const keyHex: string = aesjs.utils.hex.fromBytes(crypto.getRandomValues(new Uint8Array(32)));
    await SecureStore.setItemAsync(keyName, keyHex);
    return aesjs.utils.hex.toBytes(keyHex);
  }

  async getItem(name: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(name);
    if (!encrypted) return null;

    const key = await this.getKey(name);
    const [ivHex, dataHex] = encrypted.split(':');
    if (!ivHex || !dataHex) return null;

    const cipher = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(aesjs.utils.hex.toBytes(ivHex)));
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(dataHex));
    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async setItem(name: string, value: string): Promise<void> {
    const key = await this.getKey(name);
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const cipher = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(iv));
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));

    const encrypted = `${aesjs.utils.hex.fromBytes(iv)}:${aesjs.utils.hex.fromBytes(encryptedBytes)}`;
    await AsyncStorage.setItem(name, encrypted);
  }

  async removeItem(name: string): Promise<void> {
    await AsyncStorage.removeItem(name);
    await SecureStore.deleteItemAsync(`${name}_key`);
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: new LargeSecureStore(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Required for React Native
  },
});
