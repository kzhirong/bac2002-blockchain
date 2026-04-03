export * from './credentialHash';
export * from './veramoAgent';
export * from './typechain';

// contractAddresses.json is written by the deploy script.
// Import it here so all apps can consume it from a single source.
export { default as contractAddresses } from '../contractAddresses.json';
