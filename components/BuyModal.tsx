import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';

interface Props {
  visible: boolean;
  artistName: string;
  price: number;
  coins: number;
  onClose: () => void;
  onConfirm: (shares: number) => Promise<void>;
}

export const BuyModal: React.FC<Props> = ({
  visible,
  artistName,
  price,
  coins,
  onClose,
  onConfirm,
}) => {
  const [shares, setShares] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const total = useMemo(() => Math.round(price * shares * 100) / 100, [price, shares]);
  const maxAffordable = Math.max(0, Math.floor(coins / Math.max(price, 0.01)));

  const adjust = (delta: number) => {
    setError('');
    setShares((prev) => Math.max(1, Math.min(maxAffordable || 1, prev + delta)));
  };

  const handleConfirm = async () => {
    if (total > coins) {
      setError('Not enough coins');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await onConfirm(shares);
      setShares(1);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Purchase failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>Buy Shares</Text>
          <Text style={styles.subtitle}>{artistName}</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Price / share</Text>
            <Text style={styles.value}>🪙 {price}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Your balance</Text>
            <Text style={styles.value}>🪙 {coins}</Text>
          </View>

          <Text style={styles.sharesLabel}>Shares</Text>
          <View style={styles.stepper}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => adjust(-1)}>
              <Text style={styles.stepText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.sharesCount}>{shares}</Text>
            <TouchableOpacity style={styles.stepBtn} onPress={() => adjust(1)}>
              <Text style={styles.stepText}>+</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.maxBtn}
            onPress={() => {
              setShares(Math.max(1, maxAffordable));
              setError('');
            }}
          >
            <Text style={styles.maxBtnText}>Max ({maxAffordable})</Text>
          </TouchableOpacity>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total cost</Text>
            <Text style={styles.totalValue}>🪙 {total}</Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.confirmBtn, (loading || maxAffordable < 1) && styles.disabled]}
            disabled={loading || maxAffordable < 1}
            onPress={handleConfirm}
          >
            {loading ? (
              <ActivityIndicator color="#0F1119" />
            ) : (
              <Text style={styles.confirmText}>Confirm Purchase</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: { color: '#6B7280', fontSize: 13 },
  value: { color: '#FF6B6B', fontWeight: '700', fontSize: 13 },
  sharesLabel: {
    color: '#6B7280',
    fontSize: 12,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 8,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: '#1F2937', fontSize: 22, fontWeight: '700' },
  sharesCount: { color: '#1F2937', fontSize: 28, fontWeight: '900', minWidth: 48, textAlign: 'center' },
  maxBtn: { alignSelf: 'center', marginTop: 10 },
  maxBtnText: { color: '#14B8A6', fontWeight: '700', fontSize: 13 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#252A3A',
  },
  totalLabel: { color: '#6B7280', fontSize: 14 },
  totalValue: { color: '#FF6B6B', fontSize: 20, fontWeight: '900' },
  error: { color: '#FF6B6B', textAlign: 'center', marginBottom: 8 },
  confirmBtn: {
    backgroundColor: '#14B8A6',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  disabled: { opacity: 0.5 },
  confirmText: { color: '#0F1119', fontWeight: '800', fontSize: 15 },
  cancelBtn: { alignItems: 'center', marginTop: 14 },
  cancelText: { color: '#6B7280', fontWeight: '600' },
});
