import { Platform } from 'react-native';

import { SafetyMapScreen as NativeSafetyMapScreen } from './SafetyMapScreen.native';
import { SafetyMapScreen as WebSafetyMapScreen } from './SafetyMapScreen.web';

export const SafetyMapScreen = Platform.OS === 'web' ? WebSafetyMapScreen : NativeSafetyMapScreen;
