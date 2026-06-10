import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { useTheme } from '../theme/ThemeContext';
import { AppNotification } from '../types';
import { formatDateTime } from '../utils/formatters';

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  overdue_7days:    'alert-circle-outline',
  payment_received: 'checkmark-circle-outline',
};

const TYPE_COLOR: Record<string, string> = {
  overdue_7days:    '#DC2626',
  payment_received: '#15803D',
};

function NotifItem({
  notif,
  onPress,
}: {
  notif: AppNotification;
  onPress: () => void;
}) {
  const { colors: C } = useTheme();
  const icon = TYPE_ICON[notif.type] ?? 'notifications-outline';
  const color = TYPE_COLOR[notif.type] ?? '#2563FF';
  const isUnread = !notif.readAt;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.item,
        { borderBottomColor: C.border },
        isUnread && { backgroundColor: C.cardAlt },
      ]}
    >
      <View style={[styles.itemIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={styles.itemBody}>
        <Text style={[styles.itemMsg, { color: C.textPrimary }, isUnread && { fontWeight: '600' }]}>
          {notif.message}
        </Text>
        <Text style={[styles.itemTime, { color: C.textTertiary }]}>
          {formatDateTime(notif.createdAt)}
        </Text>
      </View>
      {isUnread && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

export function NotificationBell({
  onNavigateToInvoice,
}: {
  onNavigateToInvoice: (invoiceId: string) => void;
}) {
  const { colors: C } = useTheme();
  const notifications = useAppStore((s) => s.appNotifications);
  const markNotificationRead = useAppStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useAppStore((s) => s.markAllNotificationsRead);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const bellRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const handlePress = (notif: AppNotification) => {
    markNotificationRead(notif.id);
    setOpen(false);
    if (notif.invoiceId) onNavigateToInvoice(notif.invoiceId);
  };

  const handleToggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    if (Platform.OS === 'web' && bellRef.current) {
      // @ts-ignore — measureInWindow finnes på web via react-native-web
      bellRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
        setPos({ top: y + height + 6, left: x + width - 252 });
        setOpen(true);
      });
    } else {
      setOpen(true);
    }
  };

  return (
    <View style={{ position: 'relative', zIndex: 300 }}>
      <TouchableOpacity ref={bellRef} onPress={handleToggle} activeOpacity={0.8} style={styles.bell}>
        <Ionicons name="notifications-outline" size={19} color="rgba(255,255,255,0.75)" />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {open && (
        <>
          {/* Backdrop */}
          <TouchableOpacity
            onPress={() => setOpen(false)}
            style={Platform.OS === 'web'
              ? ({ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 } as any)
              : StyleSheet.absoluteFillObject
            }
          />

          {/* Dropdown */}
          <View
            style={[
              styles.dropdown,
              { backgroundColor: C.cardBg, borderColor: C.border },
              Platform.OS === 'web' && pos
                ? ({ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 } as any)
                : null,
            ]}
          >
            {/* Header */}
            <View style={[styles.dropHeader, { borderBottomColor: C.border }]}>
              <Text style={[styles.dropTitle, { color: C.textPrimary }]}>Varsler</Text>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={() => { markAllNotificationsRead(); }} activeOpacity={0.7}>
                  <Text style={styles.markAll}>Merk alle lest</Text>
                </TouchableOpacity>
              )}
            </View>

            {notifications.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="notifications-off-outline" size={28} color={C.textTertiary} />
                <Text style={[styles.emptyText, { color: C.textTertiary }]}>Ingen varsler</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                {notifications.map((n) => (
                  <NotifItem key={n.id} notif={n} onPress={() => handlePress(n)} />
                ))}
              </ScrollView>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bell: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  dropdown: {
    position: 'absolute',
    top: 38,
    left: -220,
    width: 300,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 301,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  dropHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dropTitle: { fontSize: 14, fontWeight: '700' },
  markAll: { fontSize: 12, color: '#2563FF', fontWeight: '500' },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  itemIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemBody: { flex: 1, gap: 2 },
  itemMsg: { fontSize: 13, lineHeight: 18 },
  itemTime: { fontSize: 11 },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#2563FF',
    marginTop: 5,
    flexShrink: 0,
  },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  emptyText: { fontSize: 13 },
});
