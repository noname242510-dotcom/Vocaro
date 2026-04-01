import { NativeBiometric } from '@capgo/capacitor-native-biometric';

export async function isBiometricAvailable() {
  try {
    const result = await NativeBiometric.isAvailable();
    return result.isAvailable;
  } catch (error) {
    console.error('Biometric availability check failed:', error);
    return false;
  }
}

export async function performBiometricAuth() {
  try {
    const available = await isBiometricAvailable();
    if (!available) return false;

    await NativeBiometric.verifyIdentity({
      reason: "Melde dich sicher mit Face ID an",
      title: "Biometrische Anmeldung",
      subtitle: "Bitte authentifiziere dich",
      description: "Berühre den Sensor oder schaue in die Kamera",
    });
    return true;
  } catch (error) {
    console.error('Biometric authentication failed:', error);
    return false;
  }
}
