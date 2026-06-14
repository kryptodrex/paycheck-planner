// Custom entry point. Polyfill global crypto.getRandomValues BEFORE expo-router
// (and therefore crypto-js, which captures `global.crypto` at module load) so AES
// encryption can generate a secure random IV/salt on device. Without this,
// crypto-js throws "Native crypto module could not be used to get secure random number".
import 'react-native-get-random-values';
import 'expo-router/entry';
