import { NativeTabs, Icon, Label, VectorIcon } from 'expo-router/unstable-native-tabs';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '../../src/contexts/ThemeContext';

/**
 * Native bottom tabs — UITabBar on iOS (the system liquid-glass bar) and the
 * native bottom navigation bar on Android. Settings is intentionally not a tab;
 * it's reached from the gear in each screen's header.
 */
export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <NativeTabs tintColor={colors.accentPrimary} indicatorColor={colors.accentPrimary + '33'}>
      <NativeTabs.Trigger name="summary">
        <Label>Overview</Label>
        <Icon sf="chart.bar.fill" androidSrc={<VectorIcon family={MaterialIcons} name="dashboard" />} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="breakdown">
        <Label>Breakdown</Label>
        <Icon sf="list.bullet.rectangle.fill" androidSrc={<VectorIcon family={MaterialIcons} name="list-alt" />} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="money">
        <Label>Money</Label>
        <Icon sf="dollarsign.circle.fill" androidSrc={<VectorIcon family={MaterialIcons} name="attach-money" />} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="accounts">
        <Label>Accounts</Label>
        <Icon sf="creditcard.fill" androidSrc={<VectorIcon family={MaterialIcons} name="account-balance-wallet" />} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
