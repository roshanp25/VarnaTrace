import { router } from 'expo-router';

import { ParentalGateScreen } from '../src/features/parental-gate/ParentalGateScreen';

export default function ParentalGateRoute() {
  return <ParentalGateScreen onSuccess={() => router.replace('/paywall')} />;
}
